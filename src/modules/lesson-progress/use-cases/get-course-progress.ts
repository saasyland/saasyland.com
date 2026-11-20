import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { course } from "~/src/modules/course/course.schema"
import { LESSON_PROGRESS_QUERY_KEYS } from "~/src/modules/lesson-progress/lesson-progress.constants"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const published = eq(lesson.status, LESSON_STATUS.PUBLISHED)

const publishedLessonOfCourse = and(eq(lesson.courseId, course.id), published)

const publishedLessonInProgress = and(eq(lesson.id, lessonProgress.lessonId), published)

export const getCourseProgress = createServerFn({ method: "GET" })
  .middleware([authorized({ course: ["read"] })])
  .handler(async () => {
    const [courses, learners] = await db.batch([
      db
        .select({ id: course.id, lessons: count(lesson.id), title: course.title })
        .from(course)
        .leftJoin(lesson, publishedLessonOfCourse)
        .groupBy(course.id)
        .orderBy(asc(course.position), asc(course.id)),
      db
        .select({ completed: count(lessonProgress.completedAt), courseId: lesson.courseId, userId: lessonProgress.userId })
        .from(lessonProgress)
        .innerJoin(lesson, publishedLessonInProgress)
        .groupBy(lesson.courseId, lessonProgress.userId),
    ])
    const learnersByCourse = Map.groupBy(learners, ({ courseId }) => courseId)

    return {
      learners: new Set(learners.map(({ userId }) => userId)).size,
      rows: courses.map(({ id, lessons, title }) => {
        const started = learnersByCourse.get(id) ?? []

        return {
          completedLessons: started.reduce((total, { completed }) => total + completed, 0),
          finished: started.filter(({ completed }) => completed === lessons).length,
          id,
          learners: started.length,
          lessons,
          title,
        }
      }),
    }
  })

export const courseProgressQuery = queryOptions({
  queryFn: () => getCourseProgress(),
  queryKey: LESSON_PROGRESS_QUERY_KEYS.COURSE_PROGRESS,
})
