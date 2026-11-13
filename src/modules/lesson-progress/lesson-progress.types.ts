import type * as zod from "zod"

import type { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import type { lessonProgressZodSchemas } from "~/src/modules/lesson-progress/lesson-progress.zod"

export interface LessonProgress {
  select: typeof lessonProgress.$inferSelect
  insert: typeof lessonProgress.$inferInsert
  saveLessonProgress: zod.input<typeof lessonProgressZodSchemas.saveLessonProgress>
}
