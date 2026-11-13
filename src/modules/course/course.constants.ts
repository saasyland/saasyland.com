import { LOCALIZED_TEXT_MAX_LENGTH } from "~/src/modules/_core/utils/localized-text"
import { SLUG_MAX_LENGTH } from "~/src/modules/_core/utils/zod-fields"

export const COURSE_KIND = {
  COURSE: "course",
  PROJECT: "project",
  TUTORIAL: "tutorial",
} as const

export const COURSE_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const

export const COURSE_STALE_MS = 60_000

export const COURSE_QUERY_KEYS = {
  ALL: ["course"],
  CATALOGUE: ["course", "catalogue"],
  DETAIL: ["course", "detail"],
  EDITOR: ["course", "getCourseEditor"],
  LIST: ["course", "getCourses"],
} as const

export const COURSE_MUTATION_KEYS = {
  CREATE: ["course", "createCourse"],
  DELETE: ["course", "deleteCourse"],
  UPDATE: ["course", "updateCourse"],
} as const

export const COURSE_VALIDATION_PARAMS: Record<string, Record<string, number>> = {
  slugTooLong: { max: SLUG_MAX_LENGTH },
  textTooLong: { max: LOCALIZED_TEXT_MAX_LENGTH },
}
