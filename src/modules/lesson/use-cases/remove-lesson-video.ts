import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, notExists, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_MUTATION_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { removeVideoObjects } from "~/src/modules/video/video.objects"
import { video } from "~/src/modules/video/video.schema"

export const removeLessonVideo = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"], video: ["delete"] })])
  .validator((input: Lesson["removeLessonVideo"]) => lessonZodSchemas.removeLessonVideo.parse(input))
  .handler(async ({ data: { lessonId } }) => {
    const [row] = await db.select({ videoId: lesson.videoId }).from(lesson).where(eq(lesson.id, lessonId)).limit(1)

    if (row?.videoId === undefined || row.videoId === null) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const users = db.select({ id: lesson.id }).from(lesson).where(eq(lesson.videoId, video.id))
    const unusedVideo = and(eq(video.id, row.videoId), notExists(users))
    const [, deleted] = await db.batch([
      db
        .update(lesson)
        .set({ videoId: sql`null` })
        .where(eq(lesson.id, lessonId)),
      db.delete(video).where(unusedVideo).returning({ id: video.id }),
    ])
    const [removed] = deleted

    if (removed !== undefined) {
      await removeVideoObjects(removed.id)
    }

    return { deleted: removed !== undefined, lessonId }
  })

export const removeLessonVideoMutation = mutationOptions({
  mutationFn: (data: Lesson["removeLessonVideo"]) => removeLessonVideo({ data }),
  mutationKey: LESSON_MUTATION_KEYS.REMOVE_VIDEO,
})
