import {
  LOCALIZED_LIST_ITEM_MAX_LENGTH,
  LOCALIZED_LIST_MAX_ITEMS,
  LOCALIZED_TEXT_MAX_LENGTH,
} from "~/src/modules/_core/utils/localized-text"
import { SLUG_MAX_LENGTH } from "~/src/modules/_core/utils/zod-fields"
import { COURSE_COVER_MAX_MEGABYTES } from "~/src/modules/course/course.cover"
import { LESSON_ATTACHMENT_MAX_MEGABYTES } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { LESSON_DESCRIPTION_MAX_LENGTH, LESSON_KEY_MOMENTS_MAX_ITEMS } from "~/src/modules/lesson/lesson.constants"
import { VIDEO_UPLOAD_MAX_GIGABYTES } from "~/src/modules/video-upload/video-upload.constants"

export const COURSE_KIND = {
  COURSE: "course",
  PROJECT: "project",
  TUTORIAL: "tutorial",
} as const

export const COURSE_LEVEL = {
  ADVANCED: "advanced",
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
} as const

export const COURSE_ICON = {
  BOOK_OPEN: "book-open",
  BOT: "bot",
  CODE: "code",
  LAYERS: "layers",
  MAP: "map",
  MESSAGES_SQUARE: "messages-square",
  ROCKET: "rocket",
  SCALE: "scale",
  SHIELD_CHECK: "shield-check",
  SPARKLES: "sparkles",
} as const

export const COURSE_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const

export const COURSE_KINDS = [COURSE_KIND.COURSE, COURSE_KIND.TUTORIAL, COURSE_KIND.PROJECT] as const

export const COURSE_LEVELS = [COURSE_LEVEL.BEGINNER, COURSE_LEVEL.INTERMEDIATE, COURSE_LEVEL.ADVANCED] as const

export const COURSE_ICONS = [
  COURSE_ICON.BOOK_OPEN,
  COURSE_ICON.ROCKET,
  COURSE_ICON.MAP,
  COURSE_ICON.BOT,
  COURSE_ICON.MESSAGES_SQUARE,
  COURSE_ICON.SCALE,
  COURSE_ICON.CODE,
  COURSE_ICON.LAYERS,
  COURSE_ICON.SHIELD_CHECK,
  COURSE_ICON.SPARKLES,
] as const

export type CourseIcon = (typeof COURSE_ICONS)[number]

export const COURSE_STATUSES = [COURSE_STATUS.DRAFT, COURSE_STATUS.PUBLISHED] as const

export const COURSE_STALE_MS = 60_000

export const COURSE_SHOWCASE = {
  COURSES: 5,
  LESSONS: 5,
} as const

export const COURSE_QUERY_KEYS = {
  ALL: ["course"],
  CATALOGUE: ["course", "catalogue"],
  DETAIL: ["course", "detail"],
  EDITOR: ["course", "getCourseEditor"],
  LIST: ["course", "getCourses"],
  SEARCH: ["course", "searchCourses"],
  SHOWCASE: ["course", "showcase"],
} as const

export const COURSE_MUTATION_KEYS = {
  CREATE: ["course", "createCourse"],
  DELETE: ["course", "deleteCourses"],
  EXPORT: ["course", "exportCourses"],
  IMPORT: ["course", "importCourses"],
  MOVE: ["course", "moveCourse"],
  REMOVE_COVER: ["course", "removeCourseCover"],
  REORDER_CURRICULUM: ["course", "reorderCurriculum"],
  UPDATE: ["course", "updateCourse"],
  UPLOAD_COVER: ["course", "uploadCourseCover"],
} as const

export const COURSE_SORT_COLUMNS = ["kind", "status", "lessons", "updatedAt"] as const

export const COURSE_DOCUMENT = {
  FORMAT: "courses",
  VERSION: 1,
} as const

export const COURSE_DOCUMENT_ENTITIES = ["courses", "chapters", "lessons", "links"] as const

export type CourseDocumentEntity = (typeof COURSE_DOCUMENT_ENTITIES)[number]

export const COURSE_DOCUMENT_MAX_LENGTH = 2_000_000

export const COURSE_DOCUMENT_MEDIA_TYPE = "application/json"

export const COURSE_IMPORTS_PER_MINUTE = 10

export const COURSE_IMPORT_PROBLEMS_MAX = 20

export const COURSE_VALIDATION_PARAMS: Record<string, Record<string, number>> = {
  coverTooLarge: { max: COURSE_COVER_MAX_MEGABYTES },
  descriptionTooLong: { max: LESSON_DESCRIPTION_MAX_LENGTH },
  fileTooLarge: { max: LESSON_ATTACHMENT_MAX_MEGABYTES },
  itemTooLong: { max: LOCALIZED_LIST_ITEM_MAX_LENGTH },
  slugTooLong: { max: SLUG_MAX_LENGTH },
  textTooLong: { max: LOCALIZED_TEXT_MAX_LENGTH },
  tooManyItems: { max: LOCALIZED_LIST_MAX_ITEMS },
  tooManyKeyMoments: { max: LESSON_KEY_MOMENTS_MAX_ITEMS },
  videoTooLarge: { max: VIDEO_UPLOAD_MAX_GIGABYTES },
}

export const COURSE_OFFER_CATEGORY = {
  FREE: "Free",
  PAID: "Paid",
  PARTIALLY_FREE: "Partially Free",
} as const

export const COURSE_MODE = {
  ONLINE: "Online",
} as const
