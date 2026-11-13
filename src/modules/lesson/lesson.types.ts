import type * as zod from "zod"

import type { lesson } from "~/src/modules/lesson/lesson.schema"
import type { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

export interface Lesson {
  select: typeof lesson.$inferSelect
  insert: typeof lesson.$inferInsert
  createLesson: zod.input<typeof lessonZodSchemas.createLesson>
  deleteLesson: zod.input<typeof lessonZodSchemas.deleteLesson>
  getLessonPlayback: zod.input<typeof lessonZodSchemas.getLessonPlayback>
  moveLesson: zod.input<typeof lessonZodSchemas.moveLesson>
  updateLesson: zod.input<typeof lessonZodSchemas.updateLesson>
}
