import { BYTES_PER_GIGABYTE, BYTES_PER_MEGABYTE } from "~/src/modules/video/video.constants"

export const VIDEO_UPLOAD_STATUS = {
  ENCODING: "encoding",
  FAILED: "failed",
  QUEUED: "queued",
  UPLOADING: "uploading",
} as const

export const VIDEO_UPLOAD_STATUSES = [
  VIDEO_UPLOAD_STATUS.UPLOADING,
  VIDEO_UPLOAD_STATUS.QUEUED,
  VIDEO_UPLOAD_STATUS.ENCODING,
  VIDEO_UPLOAD_STATUS.FAILED,
] as const

export const VIDEO_UPLOAD_FAILURE = {
  ENCODING: "encoding",
  UNREADABLE: "unreadable",
} as const

export const VIDEO_UPLOAD_FAILURES = [VIDEO_UPLOAD_FAILURE.UNREADABLE, VIDEO_UPLOAD_FAILURE.ENCODING] as const

export const VIDEO_UPLOAD_FILE_TYPES = {
  m4v: { contentType: "video/x-m4v", name: "M4V" },
  mkv: { contentType: "video/x-matroska", name: "MKV" },
  mov: { contentType: "video/quicktime", name: "MOV" },
  mp4: { contentType: "video/mp4", name: "MP4" },
  webm: { contentType: "video/webm", name: "WebM" },
} as const

export type VideoUploadExtension = keyof typeof VIDEO_UPLOAD_FILE_TYPES

export const VIDEO_UPLOAD_EXTENSIONS = Object.keys(VIDEO_UPLOAD_FILE_TYPES)

export const VIDEO_UPLOAD_FORMAT_NAMES = Object.values(VIDEO_UPLOAD_FILE_TYPES).map(({ name }) => name)

export const VIDEO_UPLOAD_ACCEPTED_TYPES = [
  ...VIDEO_UPLOAD_EXTENSIONS.map((extension) => `.${extension}`),
  ...Object.values(VIDEO_UPLOAD_FILE_TYPES).map(({ contentType }) => contentType),
]

export const VIDEO_UPLOAD_KEY_PREFIX = "uploads"

export const VIDEO_UPLOAD_SOURCE_NAME = "source"

export const VIDEO_UPLOAD_MAX_GIGABYTES = 10

export const VIDEO_UPLOAD_MAX_BYTES = VIDEO_UPLOAD_MAX_GIGABYTES * BYTES_PER_GIGABYTE

export const VIDEO_UPLOAD_PART_MEGABYTES = 10

export const VIDEO_UPLOAD_PART_BYTES = VIDEO_UPLOAD_PART_MEGABYTES * BYTES_PER_MEGABYTE

export const VIDEO_UPLOAD_MAX_PARTS = Math.ceil(VIDEO_UPLOAD_MAX_BYTES / VIDEO_UPLOAD_PART_BYTES)

export const VIDEO_UPLOAD_CONCURRENCY = 3

export const VIDEO_UPLOAD_PART_ATTEMPTS = 3

export const VIDEO_UPLOAD_RETRY_DELAY_MS = 1000

export const VIDEO_UPLOAD_POLL_MS = 5000

export const VIDEO_UPLOADS_PER_MINUTE = 10

export const VIDEO_UPLOAD_MUTATION_KEYS = {
  CANCEL: ["videoUpload", "cancelVideoUpload"],
  COMPLETE: ["videoUpload", "completeVideoUpload"],
  RETRY: ["videoUpload", "retryVideoUpload"],
  START: ["videoUpload", "startVideoUpload"],
  UPLOAD_PART: ["videoUpload", "uploadVideoPart"],
} as const
