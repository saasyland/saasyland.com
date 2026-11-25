export const LESSON_ACCESS = {
  ACCOUNT: "account",
  PAID: "paid",
  PREVIEW: "preview",
} as const

export const LESSON_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const

export const LESSON_FORMAT = {
  TEXT: "text",
  VIDEO: "video",
} as const

export const LESSON_FORMATS = [LESSON_FORMAT.VIDEO, LESSON_FORMAT.TEXT] as const

export const LESSON_ACCESS_LEVELS = [LESSON_ACCESS.PREVIEW, LESSON_ACCESS.ACCOUNT, LESSON_ACCESS.PAID] as const

export const LESSON_STATUSES = [LESSON_STATUS.DRAFT, LESSON_STATUS.PUBLISHED] as const

export const LESSON_DESCRIPTION_MAX_LENGTH = 10_000

export const LESSON_KEY_MOMENTS_MAX_ITEMS = 40

export const LESSON_KEY_MOMENT_MAX_SECONDS = 86_400

export const LESSON_STALE_MS = 60_000

export const LESSON_PLAYBACK_STALE_MS = 3_600_000

export const LESSON_QUERY_KEYS = {
  ALL: ["lesson"],
  DETAIL: ["lesson", "getLesson"],
  PLAYBACK: ["lesson", "getLessonPlayback"],
  SEARCH: ["lesson", "searchLessons"],
  TITLE: ["lesson", "getLessonTitle"],
} as const

export const LESSON_MUTATION_KEYS = {
  CREATE: ["lesson", "createLesson"],
  DELETE: ["lesson", "deleteLesson"],
  REMOVE_VIDEO: ["lesson", "removeLessonVideo"],
  REPLACE_VIDEO: ["lesson", "replaceLessonVideo"],
  SET_FORMAT: ["lesson", "setLessonFormat"],
  UPDATE: ["lesson", "updateLesson"],
} as const
