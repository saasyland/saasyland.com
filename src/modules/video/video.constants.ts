export const VIDEO_KEY_PREFIX = "videos"

export const VIDEO_TITLE_MAX_LENGTH = 255

export const MEDIA_PATH_PREFIX = "/media"

export const VIDEO_FILES = {
  MASTER_PLAYLIST: "master.m3u8",
  POSTER: "poster.webp",
  POSTER_SMALL: "poster-960.webp",
  STORYBOARD_IMAGE: "storyboard.webp",
  STORYBOARD_TRACK: "storyboard.vtt",
} as const

export const POSTER_SMALL_WIDTH = 960

export const VIDEO_QUERY_KEYS = {
  ALL: ["video"],
  LIST: ["video", "getVideos"],
  PLAYBACK: ["video", "getVideoPlayback"],
} as const

export const VIDEO_MUTATION_KEYS = {
  DELETE: ["video", "deleteVideo"],
} as const
