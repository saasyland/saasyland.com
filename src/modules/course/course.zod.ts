import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { localeField, slugField } from "~/src/modules/_core/utils/zod-fields"
import { course } from "~/src/modules/course/course.schema"

const { createInsertSchema, createSelectSchema } = createSchemaFactory({ zodInstance: zod })

const getCatalogue = zod.object({
  locale: localeField,
})

const getCourse = zod.object({
  locale: localeField,
  slug: slugField,
})

const insert = createInsertSchema(course)
const select = createSelectSchema(course)

export const courseZodSchemas = {
  getCatalogue,
  getCourse,
  insert,
  select,
}
