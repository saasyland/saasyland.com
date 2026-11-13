import { S3Client, file, spawn } from "bun"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, extname, join, relative } from "node:path"
import process from "node:process"
import { parseArgs } from "node:util"
import { v7 } from "uuid"
import { z } from "zod/v4"

import { MIN_FIELD_LENGTH, localeField } from "~/src/modules/_core/utils/zod-fields"
import {
  type SourceVideo,
  encodeArguments,
  parseProbe,
  planRenditions,
  planStoryboard,
  posterArguments,
  probeArguments,
  storyboardArguments,
  storyboardTrack,
} from "~/src/modules/video/video.encoding"
import { mediaContentType, videoObjectKey } from "~/src/modules/video/video.files"
import { video } from "~/src/modules/video/video.schema"
import { videoZodSchemas } from "~/src/modules/video/video.zod"

import { readJsonc } from "./jsonc.ts"

const SCRIPT_ARGUMENTS_START = 2
const UPLOAD_CONCURRENCY = 8
const BYTES_PER_MEGABYTE = 1_048_576
const MILLISECONDS_PER_MINUTE = 60_000
const DECIMAL_PLACES = 1
const MEDIA_BINDING = "MEDIA"
const WEBVTT_SIGNATURE = "WEBVTT"
const LOCALE_SEPARATOR = "="
const SEPARATOR_LENGTH = LOCALE_SEPARATOR.length

const USAGE = `Usage: bun run video:publish:<preview|production> <video> --title "Title" [--poster image] [--captions en-US=file.vtt ...]`

const environmentSchema = z.enum(["preview", "production"])

const requiredSchema = z.string().min(MIN_FIELD_LENGTH)

const credentialsSchema = z.object({
  CLOUDFLARE_ACCESS_TOKEN: requiredSchema,
  CLOUDFLARE_ACCOUNT_ID: requiredSchema,
  CLOUDFLARE_DATABASE_ID: requiredSchema,
  FFMPEG: requiredSchema.default("ffmpeg"),
  FFPROBE: requiredSchema.default("ffprobe"),
  R2_ACCESS_KEY_ID: requiredSchema,
  R2_SECRET_ACCESS_KEY: requiredSchema,
})

const bucketSchema = z.object({ binding: z.string(), bucket_name: z.string() })
const environmentBindingsSchema = z.object({ r2_buckets: z.array(bucketSchema).default([]) }).loose()
const wranglerSchema = z.object({ env: z.record(z.string(), environmentBindingsSchema) })

const d1ErrorSchema = z.object({ message: z.string() })
const d1ResponseSchema = z.object({ errors: z.array(d1ErrorSchema), success: z.boolean() })

const captionSchema = z.string().transform((value, context) => {
  const separator = value.indexOf(LOCALE_SEPARATOR)
  const locale = localeField.safeParse(value.slice(0, Math.max(separator, 0)))
  if (!locale.success) {
    context.addIssue({ code: "custom", message: `Expected <locale>=<file.vtt>, got ${value}` })
    return z.NEVER
  }
  return { file: value.slice(separator + SEPARATOR_LENGTH), locale: locale.data }
})

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

const credentials = credentialsSchema.parse(process.env)
const captions = z.array(captionSchema).parse(values.captions ?? [])

const findBucket = async (): Promise<string> => {
  const { env } = wranglerSchema.parse(await readJsonc("wrangler.jsonc"))
  const bucket = env[environment]?.r2_buckets.find(({ binding }) => binding === MEDIA_BINDING)
  if (bucket === undefined) {
    throw new Error(`wrangler.jsonc has no ${MEDIA_BINDING} R2 binding for ${environment}`)
  }
  return bucket.bucket_name
}

const run = async (command: string, args: readonly string[]): Promise<void> => {
  const child = spawn([command, ...args], { stderr: "inherit", stdout: "inherit" })
  if ((await child.exited) !== 0) {
    throw new Error(`${basename(command)} failed: ${args.join(" ")}`)
  }
}

const probe = async (videoPath: string): Promise<SourceVideo> => {
  const child = spawn([credentials.FFPROBE, ...probeArguments(videoPath)], { stderr: "inherit", stdout: "pipe" })
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

const createStorage = (bucket: string): S3Client =>
  new S3Client({
    accessKeyId: credentials.R2_ACCESS_KEY_ID,
    bucket,
    endpoint: `https://${credentials.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    secretAccessKey: credentials.R2_SECRET_ACCESS_KEY,
  })

const uploadAll = async ({ files, output, storage, videoId }: { files: string[]; output: string; storage: S3Client; videoId: string }) => {
  const uploaded = new Set<string>()

  const upload = async (path: string): Promise<void> => {
    const type = mediaContentType(path)
    if (type === undefined) {
      throw new Error(`Unexpected output file ${path}`)
    }
    await storage.write(videoObjectKey({ file: path, videoId }), file(join(output, path)), { type })
    uploaded.add(path)
    process.stdout.write(`\rUploaded ${String(uploaded.size)}/${String(files.length)} files`)
  }

  const uploadLane = async (index: number): Promise<void> => {
    const path = files[index]
    if (path === undefined) {
      return
    }
    await upload(path)
    await uploadLane(index + UPLOAD_CONCURRENCY)
  }

  await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, (_, lane) => uploadLane(lane)))
  process.stdout.write("\n")
}

const database = drizzle(async (sql, params) => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${credentials.CLOUDFLARE_ACCOUNT_ID}/d1/database/${credentials.CLOUDFLARE_DATABASE_ID}/query`,
    {
      body: JSON.stringify({ params, sql }),
      headers: { Authorization: `Bearer ${credentials.CLOUDFLARE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      method: "POST",
    },
  )
  const body = d1ResponseSchema.parse(await response.json())
  if (!body.success) {
    throw new Error(`D1 rejected the video: ${body.errors.map(({ message }) => message).join("; ")}`)
  }
  return { rows: [] }
})

const bucket = await findBucket()
const storage = createStorage(bucket)
const source = await probe(input)
const renditions = planRenditions(source)
const storyboard = planStoryboard(source)
const videoId = v7()
const output = await mkdtemp(join(tmpdir(), "saasyland-video-"))

try {
  console.log(`Encoding ${renditions.map(({ name }) => name).join(", ")}${source.hasAudio ? " + audio" : ""}`)
  await run(credentials.FFMPEG, encodeArguments({ input, output, renditions, source }))
  await Promise.all(posterArguments({ image: values.poster, input, output, source }).map((args) => run(credentials.FFMPEG, args)))
  await run(credentials.FFMPEG, storyboardArguments({ input, output, storyboard }))
  await writeFile(join(output, "storyboard.vtt"), storyboardTrack({ source, storyboard }))
  await copyCaptions(output)

  const files = await listFiles(output)
  const stats = await Promise.all(files.map((path) => stat(join(output, path))))
  const sizeBytes = stats.reduce((total, { size }) => total + size, 0)

  await uploadAll({ files, output, storage, videoId })

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
    await database.insert(video).values(row)
  } catch (error) {
    await Promise.all(files.map((path) => storage.delete(videoObjectKey({ file: path, videoId }))))
    throw error
  }

  console.log(
    `Published ${row.title} (${videoId}) to ${bucket}: ${(source.durationMs / MILLISECONDS_PER_MINUTE).toFixed(DECIMAL_PLACES)} min, ${String(files.length)} files, ${(sizeBytes / BYTES_PER_MEGABYTE).toFixed(DECIMAL_PLACES)} MB`,
  )
} finally {
  await rm(output, { force: true, recursive: true })
}
