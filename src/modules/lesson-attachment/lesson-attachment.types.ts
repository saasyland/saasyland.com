import type * as zod from "zod"

import type { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import type { attachmentTarget } from "~/src/modules/lesson-attachment/lesson-attachment.utils"
import type { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"

export interface LessonAttachment {
  select: typeof lessonAttachment.$inferSelect
  insert: typeof lessonAttachment.$inferInsert
  target: ReturnType<typeof attachmentTarget>
  createLessonAttachment: zod.input<typeof lessonAttachmentZodSchemas.createLessonAttachment>
  deleteLessonAttachment: zod.input<typeof lessonAttachmentZodSchemas.deleteLessonAttachment>
  moveLessonAttachment: zod.input<typeof lessonAttachmentZodSchemas.moveLessonAttachment>
  updateLessonAttachment: zod.input<typeof lessonAttachmentZodSchemas.updateLessonAttachment>
  uploadLessonAttachment: zod.input<typeof lessonAttachmentZodSchemas.uploadLessonAttachment>
}
