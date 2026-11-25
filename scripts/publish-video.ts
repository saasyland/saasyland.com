import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseArgs } from "node:util"
import { v7 } from "uuid"
import * as zod from "zod"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"
import { localeField } from "~/src/modules/_core/utils/zod-fields"
import { MEDIA_BINDING, VIDEO_SIZE_FORMAT } from "~/src/modules/video/video.constants"
import { video } from "~/src/modules/video/video.schema"
import { videoZodSchemas } from "~/src/modules/video/video.zod"

import { MILLISECONDS_PER_MINUTE } from "~/src/lib/duration"
import { BYTES_PER_MEGABYTE } from "~/src/lib/file-size"

import { executeD1, inline, sqlBuilder } from "./d1-execute.ts"
import { scriptArguments } from "./run-command.ts"
import { encodeRecording, removeVideoFiles, uploadVideoFiles } from "./video-pipeline.ts"
import { readBucketName } from "./wrangler-config.ts"

const LOCALE_SEPARATOR = "="
const SEPARATOR_LENGTH = LOCALE_SEPARATOR.length

const USAGE = `Usage: bun run video:publish:<preview|production> <video> --title "Title" [--poster image] [--captions en-US=file.vtt ...]`

const environmentSchema = zod.enum([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION])

const captionSchema = zod.string().transform((value, context) => {
  const separator = value.indexOf(LOCALE_SEPARATOR)
  const locale = localeField.safeParse(value.slice(0, Math.max(separator, 0)))
  if (!locale.success) {
    context.addIssue({ code: "custom", message: `Expected <locale>=<file.vtt>, got ${value}` })
    return zod.NEVER
  }
  return { file: value.slice(separator + SEPARATOR_LENGTH), locale: locale.data }
})

const { positionals, values } = parseArgs({
  allowPositionals: true,
  args: scriptArguments(),
  options: {
    captions: { multiple: true, type: "string" },
    poster: { type: "string" },
    title: { type: "string" },
  },
})

const [environmentArgument, input] = positionals
const environment = environmentSchema.parse(environmentArgument)
if (input === undefined || values.title === undefined) {
  throw new Error(USAGE)
}

const captions = zod.array(captionSchema).parse(values.captions ?? [])
const bucket = await readBucketName({ binding: MEDIA_BINDING, environment })
const videoId = v7()
const output = await mkdtemp(join(tmpdir(), "saasyland-video-"))

try {
  const { files, media, sizeBytes, source } = await encodeRecording({ captions, input, output, poster: values.poster })
  await uploadVideoFiles({ bucket, environment, files, lists: output, media, videoId })

  const row = videoZodSchemas.registerVideo.parse({
    captionLocales: captions.map(({ locale }) => locale),
    durationMs: source.durationMs,
    height: source.height,
    id: videoId,
    sizeBytes,
    title: values.title,
    width: source.width,
  })

  try {
    await executeD1({ environment, input: ["--command", inline(sqlBuilder.insert(video).values(row).toSQL())] })
  } catch (error) {
    await removeVideoFiles({ bucket, environment, files, videoId })
    throw error
  }

  console.log(
    `Published ${row.title} (${videoId}) to ${bucket}: ${(source.durationMs / MILLISECONDS_PER_MINUTE).toFixed(1)} min, ${String(files.length)} files, ${new Intl.NumberFormat(I18N.DEFAULT_LOCALE, VIDEO_SIZE_FORMAT).format(sizeBytes / BYTES_PER_MEGABYTE)}`,
  )
} finally {
  await rm(output, { force: true, recursive: true })
}
