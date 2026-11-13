import type * as zod from "zod"

import type { course } from "~/src/modules/course/course.schema"
import type { courseZodSchemas } from "~/src/modules/course/course.zod"

export interface Course {
  select: typeof course.$inferSelect
  insert: typeof course.$inferInsert
  getCatalogue: zod.input<typeof courseZodSchemas.getCatalogue>
  getCourse: zod.input<typeof courseZodSchemas.getCourse>
}
