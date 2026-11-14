export const VIDEO_KEY_PREFIX = "videos"

export const VIDEO_TITLE_MAX_LENGTH = 255

export const MEDIA_PATH_PREFIX = "/media"

export const POSTER_WIDTH = 1920

export const POSTER_SMALL_WIDTH = 960

export const VIDEO_FILES = {
  MASTER_PLAYLIST: "master.m3u8",
  POSTER: "poster.webp",
  POSTER_SMALL: `poster-${String(POSTER_SMALL_WIDTH)}.webp`,
  STORYBOARD_IMAGE: "storyboard.webp",
  STORYBOARD_TRACK: "storyboard.vtt",
} as const

export const BYTES_PER_MEGABYTE = 1_000_000

export const VIDEO_SIZE_FORMAT = { maximumFractionDigits: 1, style: "unit", unit: "megabyte" } as const

export const VIDEO_QUERY_KEYS = {
  ALL: ["video"],
  LIST: ["video", "getVideos"],
  PLAYBACK: ["video", "getVideoPlayback"],
} as const

export const VIDEO_MUTATION_KEYS = {
  DELETE: ["video", "deleteVideo"],
} as const
