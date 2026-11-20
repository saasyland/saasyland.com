import zod from "zod/v4"

import { MOVE_DIRECTIONS } from "~/src/modules/_core/constants/ordering"
import { localizedListSchema, localizedTextSchema } from "~/src/modules/_core/utils/localized-text"
import { paginationSchema } from "~/src/modules/_core/utils/pagination"
import { idField, localeField, slugField } from "~/src/modules/_core/utils/zod-fields"
import { COURSE_ICONS, COURSE_KINDS, COURSE_LEVELS, COURSE_STATUSES } from "~/src/modules/course/course.constants"

const courseIdInput = zod.object({
  courseId: idField,
})

const courseFields = zod.object({
  icon: zod.enum(COURSE_ICONS),
  kind: zod.enum(COURSE_KINDS),
  level: zod.enum(COURSE_LEVELS),
  outcomes: localizedListSchema,
  prerequisites: localizedListSchema,
  slug: slugField,
  status: zod.enum(COURSE_STATUSES),
  summary: localizedTextSchema,
  title: localizedTextSchema,
})

const createCourse = courseFields

const deleteCourse = courseIdInput

const getCatalogue = zod.object({
  locale: localeField,
})

const getCourse = zod.object({
  locale: localeField,
  slug: slugField,
})

const getCourseEditor = courseIdInput

const getCourseShowcase = zod.object({
  locale: localeField,
})

const getCourses = paginationSchema

const moveCourse = courseIdInput.extend({ direction: zod.enum(MOVE_DIRECTIONS) })

const updateCourse = courseFields.extend(courseIdInput.shape)

export const courseZodSchemas = {
  createCourse,
  deleteCourse,
  getCatalogue,
  getCourse,
  getCourseEditor,
  getCourseShowcase,
  getCourses,
  moveCourse,
  updateCourse,
}
