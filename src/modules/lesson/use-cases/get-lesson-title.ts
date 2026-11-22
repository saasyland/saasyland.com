import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { course } from "~/src/modules/course/course.schema"
import { LESSON_QUERY_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

export const getLessonTitle = createServerFn({ method: "GET" })
  .middleware([authorized({ course: ["read"] })])
  .validator((input: Lesson["getLessonTitle"]) => lessonZodSchemas.getLessonTitle.parse(input))
  .handler(async ({ data: { lessonId } }) => {
    const [row] = await db
      .select({ course: course.title, lesson: lesson.title })
      .from(lesson)
      .innerJoin(course, eq(course.id, lesson.courseId))
      .where(eq(lesson.id, lessonId))
      .limit(1)

    return { title: row }
  })

export const lessonTitleQuery = (input: Lesson["getLessonTitle"]) =>
  queryOptions({
    queryFn: () => getLessonTitle({ data: input }),
    queryKey: [...LESSON_QUERY_KEYS.TITLE, input],
  })
