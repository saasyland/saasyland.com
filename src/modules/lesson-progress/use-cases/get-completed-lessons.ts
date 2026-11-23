import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, count, eq, sql } from "drizzle-orm"
import * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import { LESSON_PROGRESS_QUERY_KEYS } from "~/src/modules/lesson-progress/lesson-progress.constants"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const completedLessonsSchema = zod.object({ completed: zod.int().nonnegative(), total: zod.int().nonnegative() })

export const getCompletedLessons = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }) => {
    const [progress] = await db
      .select({
        completed: sql<number>`coalesce(sum(${lessonProgress.completedAt} is not null), 0)`,
        total: count(lesson.id),
      })
      .from(lesson)
      .innerJoin(course, and(eq(course.id, lesson.courseId), eq(course.status, COURSE_STATUS.PUBLISHED)))
      .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lesson.id), eq(lessonProgress.userId, context.auth.user.id)))
      .where(eq(lesson.status, LESSON_STATUS.PUBLISHED))

    return completedLessonsSchema.parse(progress)
  })

export const completedLessonsQuery = queryOptions({
  queryFn: () => getCompletedLessons(),
  queryKey: LESSON_PROGRESS_QUERY_KEYS.COMPLETED_LESSONS,
})
