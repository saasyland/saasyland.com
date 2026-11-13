import type * as zod from "zod"

import type { course } from "~/src/modules/course/course.schema"
import type { courseZodSchemas } from "~/src/modules/course/course.zod"
import type { getCatalogue } from "~/src/modules/course/use-cases/get-catalogue"
import type { getCourse } from "~/src/modules/course/use-cases/get-course"

type CoursePage = Awaited<ReturnType<typeof getCourse>>

export interface Course {
  select: typeof course.$inferSelect
  insert: typeof course.$inferInsert
  catalogue: Awaited<ReturnType<typeof getCatalogue>>
  page: CoursePage
  pageLesson: CoursePage["chapters"][number]["lessons"][number]
  getCatalogue: zod.input<typeof courseZodSchemas.getCatalogue>
  getCourse: zod.input<typeof courseZodSchemas.getCourse>
}
