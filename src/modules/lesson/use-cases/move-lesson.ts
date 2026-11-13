import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { reorder } from "~/src/modules/_core/utils/ordering"
import { LESSON_MUTATION_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

const SINGLE_ROW_LIMIT = 1

export const moveLesson = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Lesson["moveLesson"]) => lessonZodSchemas.moveLesson.parse(input))
  .handler(async ({ data: { direction, lessonId } }) => {
    const [row] = await db.select({ chapterId: lesson.chapterId }).from(lesson).where(eq(lesson.id, lessonId)).limit(SINGLE_ROW_LIMIT)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const siblings = await db
      .select({ id: lesson.id, position: lesson.position })
      .from(lesson)
      .where(eq(lesson.chapterId, row.chapterId))
      .orderBy(asc(lesson.position), asc(lesson.id))
    const [first, ...rest] = reorder(siblings, lessonId, direction).map(({ id, position }) =>
      db.update(lesson).set({ position }).where(eq(lesson.id, id)),
    )

    if (first !== undefined) {
      await db.batch([first, ...rest])
    }

    return { lessonId }
  })

export const moveLessonMutation = mutationOptions({
  mutationFn: (data: Lesson["moveLesson"]) => moveLesson({ data }),
  mutationKey: LESSON_MUTATION_KEYS.MOVE,
})
