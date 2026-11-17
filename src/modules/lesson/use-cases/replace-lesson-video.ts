import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_MUTATION_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { video } from "~/src/modules/video/video.schema"

export const replaceLessonVideo = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Lesson["replaceLessonVideo"]) => lessonZodSchemas.replaceLessonVideo.parse(input))
  .handler(async ({ data: { lessonId, videoId } }) => {
    const [replacement] = await db.select({ id: video.id }).from(video).where(eq(video.id, videoId)).limit(1)

    if (replacement === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const [row] = await db.update(lesson).set({ videoId }).where(eq(lesson.id, lessonId)).returning({ id: lesson.id })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })

export const replaceLessonVideoMutation = mutationOptions({
  mutationFn: (data: Lesson["replaceLessonVideo"]) => replaceLessonVideo({ data }),
  mutationKey: LESSON_MUTATION_KEYS.REPLACE_VIDEO,
})
