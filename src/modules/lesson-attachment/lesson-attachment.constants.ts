import { BYTES_PER_MEGABYTE, MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

export const LESSON_ATTACHMENT_KIND = {
  FILE: "file",
  LINK: "link",
} as const

export const LESSON_ATTACHMENT_KINDS = [LESSON_ATTACHMENT_KIND.FILE, LESSON_ATTACHMENT_KIND.LINK] as const

export const LESSON_ATTACHMENT_KEY_PREFIX = "attachments"

export const LESSON_ATTACHMENT_PATH_PREFIX = `${MEDIA_PATH_PREFIX}/downloads`

export const LESSON_ATTACHMENT_MAX_MEGABYTES = 25

export const LESSON_ATTACHMENT_MAX_BYTES = LESSON_ATTACHMENT_MAX_MEGABYTES * BYTES_PER_MEGABYTE

export const LESSON_ATTACHMENT_FILE_TYPES = {
  csv: "text/csv; charset=utf-8",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  json: "application/json",
  md: "text/markdown; charset=utf-8",
  pdf: "application/pdf",
  png: "image/png",
  txt: "text/plain; charset=utf-8",
  webp: "image/webp",
  zip: "application/zip",
} as const

export type LessonAttachmentExtension = keyof typeof LESSON_ATTACHMENT_FILE_TYPES

export const LESSON_ATTACHMENT_EXTENSIONS = Object.keys(LESSON_ATTACHMENT_FILE_TYPES)

export const LESSON_ATTACHMENT_FILE_NAME_MAX_LENGTH = 120

export const LESSON_ATTACHMENT_URL_MAX_LENGTH = 2048

export const LESSON_ATTACHMENT_UPLOADS_PER_MINUTE = 10

export const LESSON_ATTACHMENT_DOWNLOAD_TTL_SECONDS = 21_600

export const LESSON_ATTACHMENT_MUTATION_KEYS = {
  CREATE: ["lessonAttachment", "createLessonAttachment"],
  DELETE: ["lessonAttachment", "deleteLessonAttachment"],
  MOVE: ["lessonAttachment", "moveLessonAttachment"],
  UPDATE: ["lessonAttachment", "updateLessonAttachment"],
  UPLOAD: ["lessonAttachment", "uploadLessonAttachment"],
} as const
