import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, eq, or } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { anyTranslationContains, containsText } from "~/src/integrations/drizzle-orm/drizzle.search"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { SEARCH_HITS_LIMIT, SEARCH_STALE_MS, type SearchHit } from "~/src/modules/_core/utils/search"
import { course } from "~/src/modules/course/course.schema"
import { LESSON_QUERY_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

import { ROUTES } from "~/src/routes"

export const searchLessons = createServerFn({ method: "GET" })
  .middleware([authorized({ course: ["read"] })])
  .validator((input: Lesson["searchLessons"]) => lessonZodSchemas.searchLessons.parse(input))
  .handler(async ({ data }): Promise<readonly SearchHit[]> => {
    const rows = await db
      .select({ course: course.title, courseId: lesson.courseId, id: lesson.id, title: lesson.title })
      .from(lesson)
      .innerJoin(course, eq(lesson.courseId, course.id))
      .where(or(anyTranslationContains(lesson.title, data.text), containsText(lesson.slug, data.text)))
      .orderBy(asc(course.position), asc(lesson.position), asc(lesson.id))
      .limit(SEARCH_HITS_LIMIT)
    return rows.map((row) => ({
      detail: localize(row.course, data.locale),
      id: row.id,
      title: localize(row.title, data.locale),
      to: `${ROUTES.ADMIN_COURSES}/${row.courseId}/lessons/${row.id}`,
    }))
  })

export const searchLessonsQuery = (input: Lesson["searchLessons"]) =>
  queryOptions({
    enabled: lessonZodSchemas.searchLessons.safeParse(input).success,
    placeholderData: keepPreviousData,
    queryFn: () => searchLessons({ data: input }),
    queryKey: [...LESSON_QUERY_KEYS.SEARCH, input.locale, input.text],
    staleTime: SEARCH_STALE_MS,
  })
