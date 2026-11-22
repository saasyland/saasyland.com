import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, or } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { anyTranslationContains, containsText } from "~/src/integrations/drizzle-orm/drizzle.search"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { SEARCH_HITS_LIMIT, SEARCH_STALE_MS, type SearchHit } from "~/src/modules/_core/utils/search"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"

import { ROUTES } from "~/src/routes"

export const searchCourses = createServerFn({ method: "GET" })
  .middleware([authorized({ course: ["read"] })])
  .validator((input: Course["searchCourses"]) => courseZodSchemas.searchCourses.parse(input))
  .handler(async ({ data }): Promise<readonly SearchHit[]> => {
    const rows = await db
      .select({ id: course.id, slug: course.slug, title: course.title })
      .from(course)
      .where(or(anyTranslationContains(course.title, data.text), containsText(course.slug, data.text)))
      .orderBy(asc(course.position), asc(course.id))
      .limit(SEARCH_HITS_LIMIT)
    return rows.map(({ id, slug, title }) => ({
      detail: slug,
      id,
      title: localize(title, data.locale),
      to: `${ROUTES.ADMIN_COURSES}/${id}`,
    }))
  })

export const searchCoursesQuery = (input: Course["searchCourses"]) =>
  queryOptions({
    enabled: courseZodSchemas.searchCourses.safeParse(input).success,
    placeholderData: keepPreviousData,
    queryFn: () => searchCourses({ data: input }),
    queryKey: [...COURSE_QUERY_KEYS.SEARCH, input.locale, input.text],
    staleTime: SEARCH_STALE_MS,
  })
