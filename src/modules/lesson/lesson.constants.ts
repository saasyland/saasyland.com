export const LESSON_ACCESS = {
  ACCOUNT: "account",
  PAID: "paid",
  PREVIEW: "preview",
} as const

export const LESSON_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const

export const LESSON_QUERY_KEYS = {
  ALL: ["lesson"],
  PLAYBACK: ["lesson", "getLessonPlayback"],
} as const
