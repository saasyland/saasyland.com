import { env } from "cloudflare:workers"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { v7 } from "uuid"

import { RATE_LIMIT_WINDOW_SECONDS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { nextPosition } from "~/src/modules/_core/utils/ordering"
import {
  LESSON_ATTACHMENT_KIND,
  LESSON_ATTACHMENT_MUTATION_KEYS,
  LESSON_ATTACHMENT_UPLOADS_PER_MINUTE,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { attachmentObjectKey } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import type { LessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.types"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const UPLOAD_RATE_LIMIT = { max: LESSON_ATTACHMENT_UPLOADS_PER_MINUTE, window: RATE_LIMIT_WINDOW_SECONDS } as const

export const uploadLessonAttachment = createServerFn({ method: "POST" })
  .middleware([withRateLimit("upload-lesson-attachment", UPLOAD_RATE_LIMIT), authorized({ course: ["update"] })])
  .validator((input: LessonAttachment["uploadLessonAttachment"]) => lessonAttachmentZodSchemas.uploadLessonAttachment.parse(input))
  .handler(async ({ data: { file, lessonId, title } }) => {
    const [owner] = await db.select({ id: lesson.id }).from(lesson).where(eq(lesson.id, lessonId)).limit(1)

    if (owner === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const siblings = await db
      .select({ position: lessonAttachment.position })
      .from(lessonAttachment)
      .where(eq(lessonAttachment.lessonId, lessonId))
    const id = v7()
    const objectKey = attachmentObjectKey({ attachmentId: id, fileName: file.fileName })

    const row = await db
      .insert(lessonAttachment)
      .values({
        contentType: file.contentType,
        id,
        kind: LESSON_ATTACHMENT_KIND.FILE,
        lessonId,
        objectKey,
        position: nextPosition(siblings),
        sizeBytes: file.file.size,
        title,
      })
      .returning({ id: lessonAttachment.id })
      .get()

    await env.MEDIA.put(objectKey, file.file, { httpMetadata: { contentType: file.contentType } }).catch(async (error: unknown) => {
      await db.delete(lessonAttachment).where(eq(lessonAttachment.id, id))
      throw error
    })

    return row
  })

export const uploadLessonAttachmentMutation = mutationOptions({
  mutationFn: (data: LessonAttachment["uploadLessonAttachment"]) => uploadLessonAttachment({ data }),
  mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.UPLOAD,
})
