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

export const LESSON_MUTATION_KEYS = {
  CREATE: ["lesson", "createLesson"],
  DELETE: ["lesson", "deleteLesson"],
  MOVE: ["lesson", "moveLesson"],
  UPDATE: ["lesson", "updateLesson"],
} as const
