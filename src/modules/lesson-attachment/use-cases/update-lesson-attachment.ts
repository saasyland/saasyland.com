import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_ATTACHMENT_KIND, LESSON_ATTACHMENT_MUTATION_KEYS } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import type { LessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.types"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"

export const updateLessonAttachment = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: LessonAttachment["updateLessonAttachment"]) => lessonAttachmentZodSchemas.updateLessonAttachment.parse(input))
  .handler(async ({ data: { attachmentId, title, url } }) => {
    const link = url === undefined ? {} : { url }
    const [row] = await db
      .update(lessonAttachment)
      .set({ title, ...link })
      .where(
        and(eq(lessonAttachment.id, attachmentId), url === undefined ? undefined : eq(lessonAttachment.kind, LESSON_ATTACHMENT_KIND.LINK)),
      )
      .returning({ id: lessonAttachment.id })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })

export const updateLessonAttachmentMutation = mutationOptions({
  mutationFn: (data: LessonAttachment["updateLessonAttachment"]) => updateLessonAttachment({ data }),
  mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.UPDATE,
})
