import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_QUERY_KEYS, COURSE_STALE_MS, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { readCourseOutline } from "~/src/modules/course/course.outline"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { resolveViewer } from "~/src/modules/lesson/lesson.viewer"

export const getCourse = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: Course["getCourse"]) => courseZodSchemas.getCourse.parse(input))
  .handler(async ({ data: { locale, slug } }) => {
    const [row] = await db
      .select()
      .from(course)
      .where(and(eq(course.slug, slug), eq(course.status, COURSE_STATUS.PUBLISHED)))
      .limit(1)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return readCourseOutline({ course: row, locale, viewer: await resolveViewer() })
  })

export const courseQuery = (input: Course["getCourse"]) =>
  queryOptions({
    queryFn: () => getCourse({ data: input }),
    queryKey: [...COURSE_QUERY_KEYS.DETAIL, input.locale, input.slug],
    staleTime: COURSE_STALE_MS,
  })
