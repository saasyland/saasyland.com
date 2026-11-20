import type * as zod from "zod"

import type { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import type { lessonProgressZodSchemas } from "~/src/modules/lesson-progress/lesson-progress.zod"
import type { getCourseProgress } from "~/src/modules/lesson-progress/use-cases/get-course-progress"

export interface LessonProgress {
  select: typeof lessonProgress.$inferSelect
  insert: typeof lessonProgress.$inferInsert
  courseProgress: Awaited<ReturnType<typeof getCourseProgress>>["rows"][number]
  saveLessonProgress: zod.input<typeof lessonProgressZodSchemas.saveLessonProgress>
}
