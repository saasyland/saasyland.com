import type * as zod from "zod"

import type { lesson } from "~/src/modules/lesson/lesson.schema"
import type { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import type { getLesson } from "~/src/modules/lesson/use-cases/get-lesson"

type LessonPage = Awaited<ReturnType<typeof getLesson>>

export interface Lesson {
  select: typeof lesson.$inferSelect
  insert: typeof lesson.$inferInsert
  page: LessonPage
  detail: LessonPage["lesson"]
  attachment: LessonPage["lesson"]["attachments"][number]
  createLesson: zod.input<typeof lessonZodSchemas.createLesson>
  deleteLesson: zod.input<typeof lessonZodSchemas.deleteLesson>
  getLesson: zod.input<typeof lessonZodSchemas.getLesson>
  getLessonPlayback: zod.input<typeof lessonZodSchemas.getLessonPlayback>
  getLessonTitle: zod.input<typeof lessonZodSchemas.getLessonTitle>
  moveLesson: zod.input<typeof lessonZodSchemas.moveLesson>
  replaceLessonVideo: zod.input<typeof lessonZodSchemas.replaceLessonVideo>
  searchLessons: zod.input<typeof lessonZodSchemas.searchLessons>
  updateLesson: zod.input<typeof lessonZodSchemas.updateLesson>
}
