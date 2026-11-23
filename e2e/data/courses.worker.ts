import { drizzle } from "drizzle-orm/d1"

import { finishEncodingQueries, queuedUploadsQuery } from "../../src/modules/video-upload/video-upload.encoder"
import { videoTitle } from "../../src/modules/video-upload/video-upload.files"
import { videoDirectory } from "../../src/modules/video/video.files"
import { videoZodSchemas } from "../../src/modules/video/video.zod"
import { TEST_VIDEO } from "./videos"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

const copyFixture = async (bucket: R2Bucket, videoId: string): Promise<number> => {
  const source = videoDirectory(TEST_VIDEO.id)
  const { objects } = await bucket.list({ prefix: source })
  const copies = objects.map(async ({ key }) => {
    const object = await bucket.get(key)
    if (object !== null) {
      await bucket.put(`${videoDirectory(videoId)}${key.slice(source.length)}`, object.body, { httpMetadata: object.httpMetadata })
    }
    return object?.size ?? 0
  })

  return (await Promise.all(copies)).reduce((total, size) => total + size, 0)
}

export const COURSES_TEST_WORKER = [
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
