import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { attachmentObjectKeys, removeAttachmentObjects } from "~/src/modules/lesson-attachment/lesson-attachment.objects"
import { LESSON_MUTATION_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { removeUploadObjects, uploadObjects } from "~/src/modules/video-upload/video-upload.objects"

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Lesson["deleteLesson"]) => lessonZodSchemas.deleteLesson.parse(input))
  .handler(async ({ data }) => {
    const lessons = eq(lesson.id, data.lessonId)
    const [objectKeys, uploads] = await Promise.all([attachmentObjectKeys(lessons), uploadObjects(lessons)])
    const [row] = await db.delete(lesson).where(eq(lesson.id, data.lessonId)).returning({ id: lesson.id })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    await Promise.all([removeAttachmentObjects(objectKeys), removeUploadObjects(uploads)])

    return row
  })

export const deleteLessonMutation = mutationOptions({
  mutationFn: (data: Lesson["deleteLesson"]) => deleteLesson({ data }),
  mutationKey: LESSON_MUTATION_KEYS.DELETE,
})
