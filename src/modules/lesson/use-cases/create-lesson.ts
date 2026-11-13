import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { v7 } from "uuid"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { rethrowAsConflict } from "~/src/integrations/drizzle-orm/drizzle.errors"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { nextPosition } from "~/src/modules/_core/utils/ordering"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { LESSON_MUTATION_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

const SINGLE_ROW_LIMIT = 1

export const createLesson = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Lesson["createLesson"]) => lessonZodSchemas.createLesson.parse(input))
  .handler(async ({ data }) => {
    const [owner] = await db
      .select({ courseId: chapter.courseId })
      .from(chapter)
      .where(eq(chapter.id, data.chapterId))
      .limit(SINGLE_ROW_LIMIT)

    if (owner === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const siblings = await db.select({ position: lesson.position }).from(lesson).where(eq(lesson.chapterId, data.chapterId))

    return db
      .insert(lesson)
      .values({ ...data, courseId: owner.courseId, id: v7(), position: nextPosition(siblings) })
      .returning({ id: lesson.id })
      .get()
      .catch(rethrowAsConflict)
  })

export const createLessonMutation = mutationOptions({
  mutationFn: (data: Lesson["createLesson"]) => createLesson({ data }),
  mutationKey: LESSON_MUTATION_KEYS.CREATE,
})
