import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_PROGRESS_MUTATION_KEYS } from "~/src/modules/lesson-progress/lesson-progress.constants"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import type { LessonProgress } from "~/src/modules/lesson-progress/lesson-progress.types"
import { lessonProgressZodSchemas } from "~/src/modules/lesson-progress/lesson-progress.zod"
import { hasLessonAccess } from "~/src/modules/lesson/lesson.access"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { resolveViewer } from "~/src/modules/lesson/lesson.viewer"

const SINGLE_ROW_LIMIT = 1

export const saveLessonProgress = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: LessonProgress["saveLessonProgress"]) => lessonProgressZodSchemas.saveLessonProgress.parse(input))
  .handler(async ({ context, data: { completed, lessonId, positionMs } }) => {
    const [row] = await db
      .select({ access: lesson.access })
      .from(lesson)
      .where(and(eq(lesson.id, lessonId), eq(lesson.status, LESSON_STATUS.PUBLISHED)))
      .limit(SINGLE_ROW_LIMIT)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    if (!hasLessonAccess(row.access, await resolveViewer())) {
      throw new AppError(ERROR_CODES.FORBIDDEN)
    }

    await db
      .insert(lessonProgress)
      .values({ lessonId, positionMs, userId: context.auth.user.id, ...(completed ? { completedAt: new Date() } : {}) })
      .onConflictDoUpdate({
        set: { completedAt: sql`coalesce(${lessonProgress.completedAt}, excluded.completed_at)`, positionMs, updatedAt: new Date() },
        target: [lessonProgress.userId, lessonProgress.lessonId],
      })

    return { completed, lessonId }
  })

export const saveLessonProgressMutation = mutationOptions({
  mutationFn: (data: LessonProgress["saveLessonProgress"]) => saveLessonProgress({ data }),
  mutationKey: LESSON_PROGRESS_MUTATION_KEYS.SAVE,
})
