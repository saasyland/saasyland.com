import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_ATTACHMENT_MUTATION_KEYS } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { removeAttachmentObjects } from "~/src/modules/lesson-attachment/lesson-attachment.objects"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import type { LessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.types"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"

export const deleteLessonAttachment = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: LessonAttachment["deleteLessonAttachment"]) => lessonAttachmentZodSchemas.deleteLessonAttachment.parse(input))
  .handler(async ({ data }) => {
    const [row] = await db
      .delete(lessonAttachment)
      .where(eq(lessonAttachment.id, data.attachmentId))
      .returning({ id: lessonAttachment.id, objectKey: lessonAttachment.objectKey })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    await removeAttachmentObjects(row.objectKey === null ? [] : [row.objectKey])

    return { id: row.id }
  })

export const deleteLessonAttachmentMutation = mutationOptions({
  mutationFn: (data: LessonAttachment["deleteLessonAttachment"]) => deleteLessonAttachment({ data }),
  mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.DELETE,
})
