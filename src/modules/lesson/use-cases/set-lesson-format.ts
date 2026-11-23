import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, isNull, notExists } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_FORMAT, LESSON_MUTATION_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"

const uploads = db.select({ id: videoUpload.id }).from(videoUpload).where(eq(videoUpload.lessonId, lesson.id))

const withoutVideo = and(isNull(lesson.videoId), notExists(uploads))

export const setLessonFormat = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Lesson["setLessonFormat"]) => lessonZodSchemas.setLessonFormat.parse(input))
  .handler(async ({ data: { format, lessonId } }) => {
    const target = eq(lesson.id, lessonId)
    const [row] = await db
      .update(lesson)
      .set({ format })
      .where(format === LESSON_FORMAT.TEXT ? and(target, withoutVideo) : target)
      .returning({ format: lesson.format, id: lesson.id })

    if (row !== undefined) {
      return row
    }

    const [existing] = await db.select({ id: lesson.id }).from(lesson).where(target).limit(1)

    throw new AppError(existing === undefined ? ERROR_CODES.NOT_FOUND : ERROR_CODES.CONFLICT)
  })

export const setLessonFormatMutation = mutationOptions({
  mutationFn: (data: Lesson["setLessonFormat"]) => setLessonFormat({ data }),
  mutationKey: LESSON_MUTATION_KEYS.SET_FORMAT,
})
