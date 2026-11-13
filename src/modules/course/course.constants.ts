export const COURSE_KIND = {
  COURSE: "course",
  PROJECT: "project",
  TUTORIAL: "tutorial",
} as const

export const COURSE_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const

export const COURSE_QUERY_KEYS = {
  ALL: ["course"],
  CATALOGUE: ["course", "catalogue"],
  DETAIL: ["course", "detail"],
  LIST: ["course", "getCourses"],
} as const

export const COURSE_MUTATION_KEYS = {
  CREATE: ["course", "createCourse"],
  DELETE: ["course", "deleteCourse"],
  UPDATE: ["course", "updateCourse"],
} as const
