import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { localizedTextSchema } from "~/src/modules/_core/utils/localized-text"
import { paginationSchema } from "~/src/modules/_core/utils/pagination"
import { idField, localeField, slugField } from "~/src/modules/_core/utils/zod-fields"
import { COURSE_KINDS, COURSE_STATUSES, course } from "~/src/modules/course/course.schema"

const { createInsertSchema, createSelectSchema } = createSchemaFactory({ zodInstance: zod })

const courseIdInput = zod.object({
  courseId: idField,
})

const courseFields = zod.object({
  kind: zod.enum(COURSE_KINDS),
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

const getCourses = paginationSchema

const updateCourse = courseFields.extend(courseIdInput.shape)

const insert = createInsertSchema(course)
const select = createSelectSchema(course)

export const courseZodSchemas = {
  createCourse,
  deleteCourse,
  getCatalogue,
  getCourse,
  getCourseEditor,
  getCourses,
  insert,
  select,
  updateCourse,
}
