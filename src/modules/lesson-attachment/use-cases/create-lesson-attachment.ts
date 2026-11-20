import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { v7 } from "uuid"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { nextPosition } from "~/src/modules/_core/utils/ordering"
import { LESSON_ATTACHMENT_KIND, LESSON_ATTACHMENT_MUTATION_KEYS } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import type { LessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.types"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"
import { lesson } from "~/src/modules/lesson/lesson.schema"

export const createLessonAttachment = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: LessonAttachment["createLessonAttachment"]) => lessonAttachmentZodSchemas.createLessonAttachment.parse(input))
  .handler(async ({ data: { lessonId, title, url } }) => {
    const [owner] = await db.select({ id: lesson.id }).from(lesson).where(eq(lesson.id, lessonId)).limit(1)

    if (owner === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const siblings = await db
      .select({ position: lessonAttachment.position })
      .from(lessonAttachment)
      .where(eq(lessonAttachment.lessonId, lessonId))

    return db
      .insert(lessonAttachment)
      .values({ id: v7(), kind: LESSON_ATTACHMENT_KIND.LINK, lessonId, position: nextPosition(siblings), title, url })
      .returning({ id: lessonAttachment.id })
      .get()
  })

export const createLessonAttachmentMutation = mutationOptions({
  mutationFn: (data: LessonAttachment["createLessonAttachment"]) => createLessonAttachment({ data }),
  mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.CREATE,
})
