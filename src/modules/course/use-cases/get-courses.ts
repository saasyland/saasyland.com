import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { type SQL, and, asc, count, desc, eq, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { anyTranslationContains, containsText, oneOf, withinDates, withinNumbers } from "~/src/integrations/drizzle-orm/drizzle.search"

import { FIRST_POSITION } from "~/src/modules/_core/constants/ordering"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const lessons = count(lesson.id)

const OTHER = sql.identifier("other_course")

const otherColumn = (column: { readonly name: string }) => sql`${OTHER}.${sql.identifier(column.name)}`

const place =
  sql<number>`(select count(*) from ${course} as ${OTHER} where (${otherColumn(course.position)}, ${otherColumn(course.id)}) < (${course.position}, ${course.id})) + ${FIRST_POSITION}`.mapWith(
    Number,
  )

const sortColumns = {
  kind: course.kind,
  lessons,
  status: course.status,
  updatedAt: course.updatedAt,
}

const titled = (text = ""): SQL[] => {
  if (text.length === 0) {
    return []
  }

  return [sql`(${anyTranslationContains(course.title, text)} or ${containsText(course.slug, text)})`]
}

const matching = (search: string, { course: title, kind, status, updatedAt }: Course["courseFilters"]): SQL | undefined =>
  and(
    ...titled(search),
    ...titled(title),
    ...oneOf(course.kind, kind),
    ...oneOf(course.status, status),
    ...withinDates(course.updatedAt, updatedAt),
  )

export const getCourses = createServerFn({ method: "GET" })
  .middleware([authorized({ course: ["read"] })])
  .validator((input: Course["getCourses"]) => courseZodSchemas.getCourses.parse(input))
  .handler(async ({ data }) => {
    const where = matching(data.search, data.filters)
    const having = and(...withinNumbers(lessons, data.filters.lessons))
    const listed = db
      .select({ id: course.id })
      .from(course)
      .leftJoin(lesson, eq(lesson.courseId, course.id))
      .where(where)
      .groupBy(course.id)
      .having(having)
      .as("listed")
    const [rows, totals] = await db.batch([
      db
        .select({
          id: course.id,
          kind: course.kind,
          lessons,
          position: place,
          slug: course.slug,
          status: course.status,
          title: course.title,
          updatedAt: course.updatedAt,
        })
        .from(course)
        .leftJoin(lesson, eq(lesson.courseId, course.id))
        .where(where)
        .groupBy(course.id)
        .having(having)
        .orderBy(...data.sorting.map((sort) => (sort.desc ? desc : asc)(sortColumns[sort.id])), asc(course.position), asc(course.id))
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(listed),
    ])
    return { rows, total: totals.reduce((sum, row) => sum + row.total, 0) }
  })

export const getCoursesPageQuery = (input: Course["getCourses"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getCourses>>>({
    queryFn: () => getCourses({ data: input }),
    queryKey: [...COURSE_QUERY_KEYS.LIST, courseZodSchemas.getCourses.parse(input)],
  })

export const getCoursesQuery = getCoursesPageQuery()
