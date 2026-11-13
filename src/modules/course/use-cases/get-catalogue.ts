import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, eq, sql } from "drizzle-orm"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_QUERY_KEYS, COURSE_STALE_MS, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

export const getCatalogue = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: Course["getCatalogue"]) => courseZodSchemas.getCatalogue.parse(input))
  .handler(async ({ data: { locale } }) => {
    const rows = await db
      .select({
        durationMs: sql<number>`coalesce(sum(${video.durationMs}), 0)`,
        id: course.id,
        kind: course.kind,
        lessons: count(lesson.id),
        previews: sql<number>`coalesce(sum(${lesson.access} = ${LESSON_ACCESS.PREVIEW}), 0)`,
        slug: course.slug,
        summary: course.summary,
        title: course.title,
      })
      .from(course)
      .leftJoin(lesson, and(eq(lesson.courseId, course.id), eq(lesson.status, LESSON_STATUS.PUBLISHED)))
      .leftJoin(video, eq(video.id, lesson.videoId))
      .where(eq(course.status, COURSE_STATUS.PUBLISHED))
      .groupBy(course.id)
      .orderBy(asc(course.position), asc(course.id))

    return rows.map((row) => ({
      durationMs: row.durationMs,
      id: row.id,
      kind: row.kind,
      lessons: row.lessons,
      previews: row.previews,
      slug: row.slug,
      summary: localize(row.summary, locale),
      title: localize(row.title, locale),
    }))
  })

export const catalogueQuery = (input: Course["getCatalogue"]) =>
  queryOptions({
    queryFn: () => getCatalogue({ data: input }),
    queryKey: [...COURSE_QUERY_KEYS.CATALOGUE, input.locale],
    staleTime: COURSE_STALE_MS,
  })
