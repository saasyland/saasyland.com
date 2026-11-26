import { drizzle } from "drizzle-orm/d1"

import { MILLISECONDS_PER_SECOND, SECONDS_PER_HOUR } from "../../src/lib/duration"
import { LESSON_ATTACHMENT_DOWNLOAD_TTL_SECONDS } from "../../src/modules/lesson-attachment/lesson-attachment.constants"
import { signDownload } from "../../src/modules/lesson-attachment/lesson-attachment.download"
import { attachmentObjectKey } from "../../src/modules/lesson-attachment/lesson-attachment.files"
import { finishEncodingQueries, queuedUploadsQuery } from "../../src/modules/video-upload/video-upload.encoder"
import { videoTitle } from "../../src/modules/video-upload/video-upload.files"
import { videoDirectory } from "../../src/modules/video/video.files"
import { PLAYBACK_TTL_SECONDS, createPlayback } from "../../src/modules/video/video.playback"
import { videoZodSchemas } from "../../src/modules/video/video.zod"
import { TEST_MATERIALS } from "./courses"
import { TEST_VIDEO } from "./videos"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

const [workbook] = TEST_MATERIALS

const signedBefore = ({ now, ttlSeconds }: { readonly now: number; readonly ttlSeconds: number }): number =>
  now - (ttlSeconds + SECONDS_PER_HOUR) * MILLISECONDS_PER_SECOND

const signedPaths = async ({ download, playback, secret }: { readonly download: number; readonly playback: number; readonly secret: string }) => ({
  download: await signDownload({
    attachmentId: workbook.id,
    now: download,
    objectKey: attachmentObjectKey({ attachmentId: workbook.id, fileName: workbook.fileName }),
    secret,
  }),
  playlist: (await createPlayback({ now: playback, secret, video: { captionLocales: [...TEST_VIDEO.captionLocales], id: TEST_VIDEO.id } })).src,
})

const copyFixture = async (bucket: R2Bucket, videoId: string): Promise<number> => {
  const source = videoDirectory(TEST_VIDEO.id)
  const { objects } = await bucket.list({ prefix: source })
  const copies = objects.map(async ({ key }) => {
    const object = await bucket.get(key)
    if (object !== null) {
      const httpMetadata = new Headers()
      object.writeHttpMetadata(httpMetadata)
      await bucket.put(`${videoDirectory(videoId)}${key.slice(source.length)}`, object.body, { httpMetadata })
    }
    return object?.size ?? 0
  })

  return (await Promise.all(copies)).reduce((total, size) => total + size, 0)
}

export const COURSES_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/media/signed-paths",
    respond: async (_url, env) => {
      const now = Date.now()
      const secret = env.AUTH_SECRET

      return Response.json({
        current: await signedPaths({ download: now, playback: now, secret }),
        expired: await signedPaths({
          download: signedBefore({ now, ttlSeconds: LESSON_ATTACHMENT_DOWNLOAD_TTL_SECONDS }),
          playback: signedBefore({ now, ttlSeconds: PLAYBACK_TTL_SECONDS }),
          secret,
        }),
      })
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/videos/encode",
    respond: async (_url, env) => {
      const database = drizzle(env.DB)
      const uploads = await queuedUploadsQuery(database)
      const encoded = await Promise.all(
        uploads.map(async ({ fileName, id, lessonId, objectKey }) => {
          const sizeBytes = await copyFixture(env.MEDIA, id)
          const row = videoZodSchemas.registerVideo.parse({ ...TEST_VIDEO, id, sizeBytes, title: videoTitle(fileName) })
          await database.batch([...finishEncodingQueries(database, { lessonId, row })])
          await env.MEDIA.delete(objectKey)
          return id
        }),
      )

      return Response.json({ encoded })
    },
  },
] as const satisfies readonly TestWorkerEntry[]
