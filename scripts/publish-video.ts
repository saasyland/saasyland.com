import { spawn } from "bun"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, extname, join, relative } from "node:path"
import process from "node:process"
import { parseArgs } from "node:util"
import sharp from "sharp"
import { v7 } from "uuid"
import { z } from "zod/v4"

import { MIN_FIELD_LENGTH, localeField } from "~/src/modules/_core/utils/zod-fields"
import { VIDEO_FILES } from "~/src/modules/video/video.constants"
import {
  IMAGE_QUALITY,
  POSTER_VARIANTS,
  type SourceVideo,
  encodeArguments,
  parseProbe,
  planRenditions,
  planStoryboard,
  posterFrameArguments,
  probeArguments,
  storyboardArguments,
  storyboardTrack,
} from "~/src/modules/video/video.encoding"
import { mediaContentType, videoObjectKey } from "~/src/modules/video/video.files"
import { video } from "~/src/modules/video/video.schema"
import { videoZodSchemas } from "~/src/modules/video/video.zod"

import { readJsonc } from "./jsonc.ts"

const SCRIPT_ARGUMENTS_START = 2
const BYTES_PER_MEGABYTE = 1_048_576
const MILLISECONDS_PER_MINUTE = 60_000
const DECIMAL_PLACES = 1
const MEDIA_BINDING = "MEDIA"
const DATABASE_BINDING = "DB"
const WEBVTT_SIGNATURE = "WEBVTT"
const LOCALE_SEPARATOR = "="
const SEPARATOR_LENGTH = LOCALE_SEPARATOR.length
const PARAMETER = "?"
const WEBP_EFFORT = 6

const USAGE = `Usage: bun run video:publish:<preview|production> <video> --title "Title" [--poster image] [--captions en-US=file.vtt ...]`

const environmentSchema = z.enum(["preview", "production"])

const toolsSchema = z.object({
  FFMPEG: z.string().min(MIN_FIELD_LENGTH).default("ffmpeg"),
  FFPROBE: z.string().min(MIN_FIELD_LENGTH).default("ffprobe"),
})

const bucketSchema = z.object({ binding: z.string(), bucket_name: z.string() })
const environmentBindingsSchema = z.object({ r2_buckets: z.array(bucketSchema).default([]) }).loose()
const wranglerSchema = z.object({ env: z.record(z.string(), environmentBindingsSchema) })

const captionSchema = z.string().transform((value, context) => {
  const separator = value.indexOf(LOCALE_SEPARATOR)
  const locale = localeField.safeParse(value.slice(0, Math.max(separator, 0)))
  if (!locale.success) {
    context.addIssue({ code: "custom", message: `Expected <locale>=<file.vtt>, got ${value}` })
    return z.NEVER
  }
  return { file: value.slice(separator + SEPARATOR_LENGTH), locale: locale.data }
})

const sqlParameterSchema = z.union([z.string(), z.number()])

const { positionals, values } = parseArgs({
  allowPositionals: true,
  args: process.argv.slice(SCRIPT_ARGUMENTS_START),
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

const tools = toolsSchema.parse(process.env)
const captions = z.array(captionSchema).parse(values.captions ?? [])

const findBucket = async (): Promise<string> => {
  const { env } = wranglerSchema.parse(await readJsonc("wrangler.jsonc"))
  const bucket = env[environment]?.r2_buckets.find(({ binding }) => binding === MEDIA_BINDING)
  if (bucket === undefined) {
    throw new Error(`wrangler.jsonc has no ${MEDIA_BINDING} R2 binding for ${environment}`)
  }
  return bucket.bucket_name
}

const run = async ([program = "", ...args]: readonly string[]): Promise<void> => {
  const child = spawn([program, ...args], { stderr: "inherit", stdout: "inherit" })
  if ((await child.exited) !== 0) {
    throw new Error(`${basename(program)} failed: ${args.join(" ")}`)
  }
}

const wrangler = (args: readonly string[]): Promise<void> => run(["bun", "x", "wrangler", ...args])

const probe = async (videoPath: string): Promise<SourceVideo> => {
  const child = spawn([tools.FFPROBE, ...probeArguments(videoPath)], { stderr: "inherit", stdout: "pipe" })
  const output = await new Response(child.stdout).text()
  if ((await child.exited) !== 0) {
    throw new Error(`Could not read ${videoPath}. Install FFmpeg (brew install ffmpeg) or set FFMPEG and FFPROBE.`)
  }
  return parseProbe(output)
}

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true })
  return entries.filter((entry) => entry.isFile()).map((entry) => relative(directory, join(entry.parentPath, entry.name)))
}

const copyCaption = async ({ output, path, locale }: { output: string; path: string; locale: string }): Promise<void> => {
  const contents = await readFile(path, "utf8")
  if (extname(path) !== ".vtt" || !contents.startsWith(WEBVTT_SIGNATURE)) {
    throw new Error(`${path} is not a WebVTT file`)
  }
  await copyFile(path, join(output, "captions", `${locale}.vtt`))
}

const copyCaptions = async (output: string): Promise<void> => {
  await mkdir(join(output, "captions"), { recursive: true })
  await Promise.all(captions.map(({ file: path, locale }) => copyCaption({ locale, output, path })))
}

const contentTypeOf = (file: string): string => {
  const type = mediaContentType(file)
  if (type === undefined) {
    throw new Error(`Unexpected output file ${file}`)
  }
  return type
}

const uploadAll = async ({
  bucket,
  files,
  lists,
  media,
  videoId,
}: {
  bucket: string
  files: string[]
  lists: string
  media: string
  videoId: string
}) => {
  const uploads = [...Map.groupBy(files, contentTypeOf)].map(([type, group], index) => ({
    entries: group.map((file) => ({ file: join(media, file), key: videoObjectKey({ file, videoId }) })),
    list: join(lists, `upload-${String(index)}.json`),
    type,
  }))
  await Promise.all(uploads.map(({ entries, list }) => writeFile(list, JSON.stringify(entries))))
  await uploads.reduce(
    (previous, { list, type }) =>
      previous.then(() => wrangler(["r2", "bulk", "put", bucket, "--remote", "--content-type", type, "--filename", list])),
    Promise.resolve(),
  )
}

const removeAll = ({ bucket, files, videoId }: { bucket: string; files: string[]; videoId: string }): Promise<void> =>
  files.reduce(
    (previous, file) =>
      previous.then(() => wrangler(["r2", "object", "delete", `${bucket}/${videoObjectKey({ file, videoId })}`, "--remote"])),
    Promise.resolve(),
  )

const sqlLiteral = (value: unknown): string => {
  const parameter = sqlParameterSchema.parse(value)
  return typeof parameter === "number" ? String(parameter) : `'${parameter.replaceAll("'", "''")}'`
}

const insertStatement = (row: z.output<typeof videoZodSchemas.registerVideo>): string => {
  const { params, sql } = drizzle(() => Promise.resolve({ rows: [] }))
    .insert(video)
    .values(row)
    .toSQL()
  const pending = [...params]
  return sql.replaceAll(PARAMETER, () => sqlLiteral(pending.shift()))
}

const bucket = await findBucket()
const source = await probe(input)
const renditions = planRenditions(source)
const storyboard = planStoryboard(source)
const videoId = v7()
const output = await mkdtemp(join(tmpdir(), "saasyland-video-"))
const media = join(output, "media")

try {
  await mkdir(media)
  console.log(`Encoding ${renditions.map(({ name }) => name).join(", ")}${source.hasAudio ? " + audio" : ""}`)
  await run([tools.FFMPEG, ...encodeArguments({ input, output: media, renditions, source })])
  const frame = values.poster ?? join(output, "poster.png")
  if (values.poster === undefined) {
    await run([tools.FFMPEG, ...posterFrameArguments({ frame, input, source })])
  }
  await Promise.all(
    POSTER_VARIANTS.map(({ file, width }) =>
      sharp(frame)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ effort: WEBP_EFFORT, quality: IMAGE_QUALITY.POSTER })
        .toFile(join(media, file)),
    ),
  )
  const sprite = join(output, "storyboard.png")
  await run([tools.FFMPEG, ...storyboardArguments({ input, sprite, storyboard })])
  await sharp(sprite).webp({ effort: WEBP_EFFORT, quality: IMAGE_QUALITY.STORYBOARD }).toFile(join(media, VIDEO_FILES.STORYBOARD_IMAGE))
  await writeFile(join(media, VIDEO_FILES.STORYBOARD_TRACK), storyboardTrack({ source, storyboard }))
  await copyCaptions(media)

  const files = await listFiles(media)
  const stats = await Promise.all(files.map((path) => stat(join(media, path))))
  const sizeBytes = stats.reduce((total, { size }) => total + size, 0)

  await uploadAll({ bucket, files, lists: output, media, videoId })

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
    await wrangler(["d1", "execute", DATABASE_BINDING, "--env", environment, "--remote", "--command", insertStatement(row)])
  } catch (error) {
    await removeAll({ bucket, files, videoId })
    throw error
  }

  console.log(
    `Published ${row.title} (${videoId}) to ${bucket}: ${(source.durationMs / MILLISECONDS_PER_MINUTE).toFixed(DECIMAL_PLACES)} min, ${String(files.length)} files, ${(sizeBytes / BYTES_PER_MEGABYTE).toFixed(DECIMAL_PLACES)} MB`,
  )
} finally {
  await rm(output, { force: true, recursive: true })
}
