import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { extname, join } from "node:path"
import * as zod from "zod"

import { VIDEO_UPLOAD_FAILURE, VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"
import {
  encodingStatusQuery,
  failEncodingQuery,
  finishEncodingQueries,
  queuedUploadsQuery,
  startEncodingQuery,
} from "~/src/modules/video-upload/video-upload.encoder"
import { videoTitle } from "~/src/modules/video-upload/video-upload.files"
import { MEDIA_BINDING } from "~/src/modules/video/video.constants"
import { videoZodSchemas } from "~/src/modules/video/video.zod"

import { D1_ENVIRONMENTS, executeD1, inline, sqlBuilder, storageLocation } from "./d1-execute.ts"
import { scriptArguments } from "./run-command.ts"
import { UnreadableVideoError, encodeRecording, removeVideoFiles, uploadVideoFiles, wrangler } from "./video-pipeline.ts"
import { readBucketName } from "./wrangler-config.ts"

const environmentSchema = zod.enum(D1_ENVIRONMENTS)

const uploadSchema = zod.object({ file_name: zod.string(), id: zod.string(), lesson_id: zod.string(), object_key: zod.string() })

const statusSchema = zod.object({ status: zod.enum([VIDEO_UPLOAD_STATUS.ENCODING]) })

const [environmentArgument] = scriptArguments()
const environment = environmentSchema.parse(environmentArgument)
const bucket = await readBucketName({ binding: MEDIA_BINDING, environment })

const execute = (query: { toSQL: () => { params: unknown[]; sql: string } }): Promise<unknown[][]> =>
  executeD1({ environment, input: ["--command", inline(query.toSQL())] })

const isStillWanted = async (uploadId: string): Promise<boolean> => {
  const [rows = []] = await execute(encodingStatusQuery(sqlBuilder, uploadId))
  return statusSchema.safeParse(rows[0]).success
}

const encode = async (upload: zod.output<typeof uploadSchema>): Promise<void> => {
  await execute(startEncodingQuery(sqlBuilder, upload.id))
  const output = await mkdtemp(join(tmpdir(), "saasyland-encode-"))
  const input = join(output, `source${extname(upload.object_key)}`)

  try {
    await wrangler(["r2", "object", "get", `${bucket}/${upload.object_key}`, "--file", input, ...storageLocation(environment)])
    const { files, media, sizeBytes, source } = await encodeRecording({ captions: [], input, output, poster: undefined })
    await uploadVideoFiles({ bucket, environment, files, lists: output, media, videoId: upload.id })

    if (!(await isStillWanted(upload.id))) {
      console.log(`${upload.file_name} was cancelled or replaced while it was encoding; its files were removed`)
      await removeVideoFiles({ bucket, environment, files, videoId: upload.id })
      return
    }

    const row = videoZodSchemas.registerVideo.parse({
      captionLocales: [],
      durationMs: source.durationMs,
      height: source.height,
      id: upload.id,
      sizeBytes,
      title: videoTitle(upload.file_name),
      width: source.width,
    })
    const statements = finishEncodingQueries(sqlBuilder, { lessonId: upload.lesson_id, row }).map((query) => `${inline(query.toSQL())};`)
    await executeD1({ environment, input: ["--command", statements.join("\n")] })
    await wrangler(["r2", "object", "delete", `${bucket}/${upload.object_key}`, ...storageLocation(environment)])
    console.log(`Encoded ${upload.file_name} (${upload.id}): ${String(files.length)} files`)
  } catch (error) {
    const failure = error instanceof UnreadableVideoError ? VIDEO_UPLOAD_FAILURE.UNREADABLE : VIDEO_UPLOAD_FAILURE.ENCODING
    console.error(`Could not encode ${upload.file_name}`, error)
    await execute(failEncodingQuery(sqlBuilder, { failure, uploadId: upload.id }))
  } finally {
    await rm(output, { force: true, recursive: true })
  }
}

const [queued = []] = await execute(queuedUploadsQuery(sqlBuilder))
const uploads = zod.array(uploadSchema).parse(queued)

console.log(`${String(uploads.length)} upload(s) waiting for the encoder in ${environment}`)
await uploads.reduce((previous, upload) => previous.then(() => encode(upload)), Promise.resolve())
