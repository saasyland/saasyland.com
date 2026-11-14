import zod from "zod/v4"

import { POSTER_SMALL_WIDTH, VIDEO_FILES } from "~/src/modules/video/video.constants"

const MILLISECONDS_PER_SECOND = 1000
const KILOBITS = 1000
const EVEN = 2

export const MAX_RENDITION_HEIGHT = 1440
const FULL_HD_HEIGHT = 1080
const HD_HEIGHT = 720
const SD_HEIGHT = 360
export const LOWER_RENDITION_HEIGHTS = [FULL_HD_HEIGHT, HD_HEIGHT, SD_HEIGHT] as const
const DISTINCT_RENDITION_RATIO = 0.9
const BITS_PER_PIXEL_SECOND = 2.4
const BUFFER_TO_RATE_RATIO = 2

export const SEGMENT_SECONDS = 6
export const KEYFRAME_SECONDS = 2
export const VIDEO_QUALITY_CRF = 21
export const AUDIO_BITRATE = "128k"
export const AUDIO_SAMPLE_RATE = "48000"
const AUDIO_CHANNELS = "2"
const AUDIO_RENDITION = "audio"

export const POSTER_WIDTH = 1920
const POSTER_POSITION = 0.1

const STORYBOARD_TILE_BOX = 240
const STORYBOARD_COLUMNS = 10
export const STORYBOARD_MAX_FRAMES = 600
export const STORYBOARD_MIN_INTERVAL_SECONDS = 2
const MIN_STORYBOARD_FRAMES = 1

const VTT_TIME_PAD = 2
const VTT_MILLISECONDS_PAD = 3
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

export interface SourceVideo {
  readonly durationMs: number
  readonly hasAudio: boolean
  readonly height: number
  readonly width: number
}

export interface Rendition {
  readonly bufferKbps: number
  readonly height: number
  readonly maxKbps: number
  readonly name: string
  readonly width: number
}

export interface Storyboard {
  readonly columns: number
  readonly frames: number
  readonly intervalSeconds: number
  readonly rows: number
  readonly tileHeight: number
  readonly tileWidth: number
}

const dimensionSchema = zod.int().positive()

const probeStreamSchema = zod.object({
  codec_type: zod.string(),
  height: dimensionSchema.optional(),
  width: dimensionSchema.optional(),
})

const probeSchema = zod.object({
  format: zod.object({ duration: zod.coerce.number().positive() }),
  streams: zod.array(probeStreamSchema),
})

const videoStreamSchema = zod.object({ height: dimensionSchema, width: dimensionSchema })

const toEven = (value: number): number => Math.max(EVEN, Math.round(value / EVEN) * EVEN)

export const probeArguments = (input: string): string[] => [
  "-v",
  "error",
  "-print_format",
  "json",
  "-show_entries",
  "format=duration:stream=codec_type,width,height",
  input,
]

export const parseProbe = (output: string): SourceVideo => {
  const probe = probeSchema.parse(JSON.parse(output))
  const { height, width } = videoStreamSchema.parse(probe.streams.find((stream) => stream.codec_type === "video"))

  return {
    durationMs: Math.round(probe.format.duration * MILLISECONDS_PER_SECOND),
    hasAudio: probe.streams.some((stream) => stream.codec_type === "audio"),
    height,
    width,
  }
}

const rendition = (source: SourceVideo, height: number): Rendition => {
  const width = toEven((source.width * height) / source.height)
  const maxKbps = Math.round((width * height * BITS_PER_PIXEL_SECOND) / KILOBITS)

  return { bufferKbps: maxKbps * BUFFER_TO_RATE_RATIO, height, maxKbps, name: `${String(height)}p`, width }
}

export const planRenditions = (source: SourceVideo): Rendition[] => {
  const topHeight = toEven(Math.min(source.height, MAX_RENDITION_HEIGHT))
  const lowerHeights = LOWER_RENDITION_HEIGHTS.filter((height) => height < topHeight * DISTINCT_RENDITION_RATIO)

  return [topHeight, ...lowerHeights].map((height) => rendition(source, height))
}

const scaleFilter = (renditions: readonly Rendition[]): string => {
  const split = `[0:v]split=${String(renditions.length)}${renditions.map((_, index) => `[s${String(index)}]`).join("")}`
  const scales = renditions.map(
    ({ height, width }, index) => `[s${String(index)}]scale=w=${String(width)}:h=${String(height)}:flags=lanczos[v${String(index)}]`,
  )

  return [split, ...scales].join(";")
}

const variantStreamMap = ({ hasAudio, renditions }: { readonly hasAudio: boolean; readonly renditions: readonly Rendition[] }) => {
  const audioGroup = hasAudio ? ",agroup:audio" : ""
  const videoVariants = renditions.map(({ name }, index) => `v:${String(index)}${audioGroup},name:${name}`)

  return [...videoVariants, ...(hasAudio ? [`a:0,agroup:audio,name:${AUDIO_RENDITION},default:yes`] : [])].join(" ")
}

const rateArguments = (renditions: readonly Rendition[]): string[] =>
  renditions.flatMap(({ bufferKbps, maxKbps }, index) => [
    `-maxrate:v:${String(index)}`,
    `${String(maxKbps)}k`,
    `-bufsize:v:${String(index)}`,
    `${String(bufferKbps)}k`,
  ])

const audioArguments = (hasAudio: boolean): string[] =>
  hasAudio ? ["-map", "0:a:0", "-c:a", "aac", "-b:a", AUDIO_BITRATE, "-ac", AUDIO_CHANNELS, "-ar", AUDIO_SAMPLE_RATE] : []

export const encodeArguments = ({
  input,
  output,
  renditions,
  source,
}: {
  readonly input: string
  readonly output: string
  readonly renditions: readonly Rendition[]
  readonly source: SourceVideo
}): string[] => [
  "-hide_banner",
  "-loglevel",
  "error",
  "-stats",
  "-y",
  "-i",
  input,
  "-filter_complex",
  scaleFilter(renditions),
  ...renditions.flatMap((_, index) => ["-map", `[v${String(index)}]`]),
  "-c:v",
  "libx264",
  "-preset",
  "slow",
  "-profile:v",
  "high",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  String(VIDEO_QUALITY_CRF),
  ...rateArguments(renditions),
  "-force_key_frames",
  `expr:gte(t,n_forced*${String(KEYFRAME_SECONDS)})`,
  "-sc_threshold",
  "0",
  ...audioArguments(source.hasAudio),
  "-f",
  "hls",
  "-hls_time",
  String(SEGMENT_SECONDS),
  "-hls_playlist_type",
  "vod",
  "-hls_segment_type",
  "fmp4",
  "-hls_flags",
  "independent_segments",
  "-hls_fmp4_init_filename",
  "init.mp4",
  "-hls_segment_filename",
  `${output}/%v/seg-%05d.m4s`,
  "-master_pl_name",
  VIDEO_FILES.MASTER_PLAYLIST,
  "-var_stream_map",
  variantStreamMap({ hasAudio: source.hasAudio, renditions }),
  `${output}/%v/index.m3u8`,
]

export const POSTER_VARIANTS = [
  { file: VIDEO_FILES.POSTER, width: POSTER_WIDTH },
  { file: VIDEO_FILES.POSTER_SMALL, width: POSTER_SMALL_WIDTH },
] as const

export const IMAGE_QUALITY = { POSTER: 80, STORYBOARD: 70 } as const

export const posterFrameArguments = ({
  frame,
  input,
  source,
}: {
  readonly frame: string
  readonly input: string
  readonly source: SourceVideo
}): string[] => [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-ss",
  String((source.durationMs * POSTER_POSITION) / MILLISECONDS_PER_SECOND),
  "-i",
  input,
  "-frames:v",
  "1",
  frame,
]

export const planStoryboard = (source: SourceVideo): Storyboard => {
  const seconds = source.durationMs / MILLISECONDS_PER_SECOND
  const intervalSeconds = Math.max(STORYBOARD_MIN_INTERVAL_SECONDS, Math.ceil(seconds / STORYBOARD_MAX_FRAMES))
  const frames = Math.max(MIN_STORYBOARD_FRAMES, Math.ceil(seconds / intervalSeconds))
  const columns = Math.min(STORYBOARD_COLUMNS, frames)
  const landscape = source.width >= source.height
  const tileWidth = landscape ? STORYBOARD_TILE_BOX : toEven((STORYBOARD_TILE_BOX * source.width) / source.height)
  const tileHeight = landscape ? toEven((STORYBOARD_TILE_BOX * source.height) / source.width) : STORYBOARD_TILE_BOX

  return { columns, frames, intervalSeconds, rows: Math.ceil(frames / columns), tileHeight, tileWidth }
}

export const storyboardArguments = ({
  input,
  sprite,
  storyboard,
}: {
  readonly input: string
  readonly sprite: string
  readonly storyboard: Storyboard
}): string[] => [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-i",
  input,
  "-vf",
  `fps=1/${String(storyboard.intervalSeconds)},scale=${String(storyboard.tileWidth)}:${String(storyboard.tileHeight)},tile=${String(storyboard.columns)}x${String(storyboard.rows)}`,
  "-frames:v",
  "1",
  sprite,
]

const vttTimestamp = (seconds: number): string => {
  const totalMilliseconds = Math.round(seconds * MILLISECONDS_PER_SECOND)
  const milliseconds = totalMilliseconds % MILLISECONDS_PER_SECOND
  const totalSeconds = Math.floor(totalMilliseconds / MILLISECONDS_PER_SECOND)
  const hours = Math.floor(totalSeconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR))
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR
  const remainder = totalSeconds % SECONDS_PER_MINUTE

  return `${[hours, minutes, remainder].map((part) => String(part).padStart(VTT_TIME_PAD, "0")).join(":")}.${String(milliseconds).padStart(VTT_MILLISECONDS_PAD, "0")}`
}

export const storyboardTrack = ({ source, storyboard }: { readonly source: SourceVideo; readonly storyboard: Storyboard }): string => {
  const seconds = source.durationMs / MILLISECONDS_PER_SECOND
  const cues = Array.from({ length: storyboard.frames }, (_, index) => {
    const start = index * storyboard.intervalSeconds
    const end = Math.min(start + storyboard.intervalSeconds, seconds)
    const left = (index % storyboard.columns) * storyboard.tileWidth
    const top = Math.floor(index / storyboard.columns) * storyboard.tileHeight

    return `${vttTimestamp(start)} --> ${vttTimestamp(end)}\n${VIDEO_FILES.STORYBOARD_IMAGE}#xywh=${String(left)},${String(top)},${String(storyboard.tileWidth)},${String(storyboard.tileHeight)}`
  })

  return `WEBVTT\n\n${cues.join("\n\n")}\n`
}
