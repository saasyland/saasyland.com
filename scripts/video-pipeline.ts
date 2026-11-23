import { spawn } from "bun"
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { basename, extname, join, relative } from "node:path"
import process from "node:process"
import sharp from "sharp"
import * as zod from "zod"

import { MIN_FIELD_LENGTH, type localeField } from "~/src/modules/_core/utils/zod-fields"
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

import { type D1Environment, storageLocation } from "./d1-execute.ts"

const WEBVTT_SIGNATURE = "WEBVTT"
const WEBP_EFFORT = 6

const toolsSchema = zod.object({
  FFMPEG: zod.string().min(MIN_FIELD_LENGTH).default("ffmpeg"),
  FFPROBE: zod.string().min(MIN_FIELD_LENGTH).default("ffprobe"),
})

const tools = toolsSchema.parse(process.env)

export interface Caption {
  readonly file: string
  readonly locale: zod.output<typeof localeField>
}

export interface EncodedRecording {
  readonly files: string[]
  readonly media: string
  readonly sizeBytes: number
  readonly source: SourceVideo
}

export class UnreadableVideoError extends Error {
  override name = "UnreadableVideoError"
}

export const run = async ([program = "", ...args]: readonly string[]): Promise<void> => {
  const child = spawn([program, ...args], { stderr: "inherit", stdout: "inherit" })
  if ((await child.exited) !== 0) {
    throw new Error(`${basename(program)} failed: ${args.join(" ")}`)
  }
}

export const wrangler = (args: readonly string[]): Promise<void> => run(["vp", "exec", "wrangler", ...args])

const probe = async (videoPath: string): Promise<SourceVideo> => {
  const child = spawn([tools.FFPROBE, ...probeArguments(videoPath)], { stderr: "inherit", stdout: "pipe" })
  const output = await new Response(child.stdout).text()
  if ((await child.exited) !== 0) {
    throw new UnreadableVideoError(`Could not read ${videoPath}. Install FFmpeg (brew install ffmpeg) or set FFMPEG and FFPROBE.`)
  }
  try {
    return parseProbe(output)
  } catch (error) {
    throw new UnreadableVideoError(`${videoPath} has no video stream`, { cause: error })
  }
}

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true })
  return entries.filter((entry) => entry.isFile()).map((entry) => relative(directory, join(entry.parentPath, entry.name)))
}

const copyCaption = async ({ locale, output, path }: { locale: string; output: string; path: string }): Promise<void> => {
  const contents = await readFile(path, "utf8")
  if (extname(path) !== ".vtt" || !contents.startsWith(WEBVTT_SIGNATURE)) {
    throw new Error(`${path} is not a WebVTT file`)
  }
  await copyFile(path, join(output, "captions", `${locale}.vtt`))
}

const contentTypeOf = (file: string): string => {
  const type = mediaContentType(file)
  if (type === undefined) {
    throw new Error(`Unexpected output file ${file}`)
  }
  return type
}

export const encodeRecording = async ({
  captions,
  input,
  output,
  poster,
}: {
  readonly captions: readonly Caption[]
  readonly input: string
  readonly output: string
  readonly poster: string | undefined
}): Promise<EncodedRecording> => {
  const source = await probe(input)
  const renditions = planRenditions(source)
  const storyboard = planStoryboard(source)
  const media = join(output, "media")

  await mkdir(join(media, "captions"), { recursive: true })
  console.log(`Encoding ${renditions.map(({ name }) => name).join(", ")}${source.hasAudio ? " + audio" : ""}`)
  await run([tools.FFMPEG, ...encodeArguments({ input, output: media, renditions, source })])
  const frame = poster ?? join(output, "poster.png")
  if (poster === undefined) {
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
  await Promise.all(captions.map(({ file: path, locale }) => copyCaption({ locale, output: media, path })))

  const files = await listFiles(media)
  const stats = await Promise.all(files.map((path) => stat(join(media, path))))

  return { files, media, sizeBytes: stats.reduce((total, { size }) => total + size, 0), source }
}

interface VideoFiles {
  readonly bucket: string
  readonly environment: D1Environment
  readonly files: readonly string[]
  readonly videoId: string
}

export const uploadVideoFiles = async ({ lists, media, ...target }: VideoFiles & { readonly lists: string; readonly media: string }) => {
  const uploads = [...Map.groupBy(target.files, contentTypeOf)].map(([type, group], index) => ({
    entries: group.map((file) => ({ file: join(media, file), key: videoObjectKey({ file, videoId: target.videoId }) })),
    list: join(lists, `upload-${String(index)}.json`),
    type,
  }))
  await Promise.all(uploads.map(({ entries, list }) => writeFile(list, JSON.stringify(entries))))
  await uploads.reduce(
    (previous, { list, type }) =>
      previous.then(() =>
        wrangler(["r2", "bulk", "put", target.bucket, ...storageLocation(target.environment), "--content-type", type, "--filename", list]),
      ),
    Promise.resolve(),
  )
}

export const removeVideoFiles = ({ bucket, environment, files, videoId }: VideoFiles): Promise<void> =>
  files.reduce(
    (previous, file) =>
      previous.then(() =>
        wrangler(["r2", "object", "delete", `${bucket}/${videoObjectKey({ file, videoId })}`, ...storageLocation(environment)]),
      ),
    Promise.resolve(),
  )
