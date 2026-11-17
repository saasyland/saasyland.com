import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { reorder } from "~/src/modules/_core/utils/ordering"
import { LESSON_ATTACHMENT_MUTATION_KEYS } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import type { LessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.types"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"

export const moveLessonAttachment = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: LessonAttachment["moveLessonAttachment"]) => lessonAttachmentZodSchemas.moveLessonAttachment.parse(input))
  .handler(async ({ data: { attachmentId, direction } }) => {
    const [row] = await db
      .select({ lessonId: lessonAttachment.lessonId })
      .from(lessonAttachment)
      .where(eq(lessonAttachment.id, attachmentId))
      .limit(1)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const siblings = await db
      .select({ id: lessonAttachment.id, position: lessonAttachment.position })
      .from(lessonAttachment)
      .where(eq(lessonAttachment.lessonId, row.lessonId))
      .orderBy(asc(lessonAttachment.position), asc(lessonAttachment.id))
    const [first, ...rest] = reorder(siblings, attachmentId, direction).map(({ id, position }) =>
      db.update(lessonAttachment).set({ position }).where(eq(lessonAttachment.id, id)),
    )

    if (first !== undefined) {
      await db.batch([first, ...rest])
    }

    return { attachmentId }
  })

export const moveLessonAttachmentMutation = mutationOptions({
  mutationFn: (data: LessonAttachment["moveLessonAttachment"]) => moveLessonAttachment({ data }),
  mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.MOVE,
})
