import type * as zod from "zod"

import type { lesson } from "~/src/modules/lesson/lesson.schema"
import type { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

export interface Lesson {
  select: typeof lesson.$inferSelect
  insert: typeof lesson.$inferInsert
  getLessonPlayback: zod.input<typeof lessonZodSchemas.getLessonPlayback>
}
