import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { rethrowAsConflict } from "~/src/integrations/drizzle-orm/drizzle.errors"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_MUTATION_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

export const updateLesson = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Lesson["updateLesson"]) => lessonZodSchemas.updateLesson.parse(input))
  .handler(async ({ data }) => {
    const { lessonId, ...fields } = data
    const [row] = await db
      .update(lesson)
      .set({ ...fields, videoId: fields.videoId ?? sql`null` })
      .where(eq(lesson.id, lessonId))
      .returning({ id: lesson.id })
      .catch(rethrowAsConflict)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })

export const updateLessonMutation = mutationOptions({
  mutationFn: (data: Lesson["updateLesson"]) => updateLesson({ data }),
  mutationKey: LESSON_MUTATION_KEYS.UPDATE,
})
