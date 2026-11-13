import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, count, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { lesson } from "~/src/modules/lesson/lesson.schema"

export const getCourses = createServerFn({ method: "GET" })
  .middleware([authorized({ course: ["read"] })])
  .validator((input: Course["getCourses"]) => courseZodSchemas.getCourses.parse(input))
  .handler(async ({ data }) => {
    const [rows, totals] = await db.batch([
      db
        .select({
          id: course.id,
          kind: course.kind,
          lessons: count(lesson.id),
          slug: course.slug,
          status: course.status,
          title: course.title,
          updatedAt: course.updatedAt,
        })
        .from(course)
        .leftJoin(lesson, eq(lesson.courseId, course.id))
        .groupBy(course.id)
        .orderBy(asc(course.position), asc(course.id))
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(course),
    ])
    return { rows, total: totals.reduce((sum, row) => sum + row.total, 0) }
  })

export const getCoursesPageQuery = (input: Course["getCourses"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getCourses>>>({
    queryFn: () => getCourses({ data: input }),
    queryKey: [...COURSE_QUERY_KEYS.LIST, courseZodSchemas.getCourses.parse(input)],
  })

export const getCoursesQuery = getCoursesPageQuery()
