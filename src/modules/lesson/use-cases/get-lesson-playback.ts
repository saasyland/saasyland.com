import { env } from "cloudflare:workers"

import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import { hasLessonAccess } from "~/src/modules/lesson/lesson.access"
import { LESSON_QUERY_KEYS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { resolveViewer } from "~/src/modules/lesson/lesson.viewer"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { createPlayback } from "~/src/modules/video/video.playback"
import { video } from "~/src/modules/video/video.schema"

const SINGLE_ROW_LIMIT = 1

export const getLessonPlayback = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: Lesson["getLessonPlayback"]) => lessonZodSchemas.getLessonPlayback.parse(input))
  .handler(async ({ data: { courseSlug, lessonSlug } }) => {
    const [row] = await db
      .select({ access: lesson.access, captionLocales: video.captionLocales, id: video.id })
      .from(lesson)
      .innerJoin(course, eq(course.id, lesson.courseId))
      .innerJoin(video, eq(video.id, lesson.videoId))
      .where(
        and(
          eq(course.slug, courseSlug),
          eq(course.status, COURSE_STATUS.PUBLISHED),
          eq(lesson.slug, lessonSlug),
          eq(lesson.status, LESSON_STATUS.PUBLISHED),
        ),
      )
      .limit(SINGLE_ROW_LIMIT)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const viewer = await resolveViewer()
    if (!hasLessonAccess(row.access, viewer)) {
      throw new AppError(viewer.userId === undefined ? ERROR_CODES.UNAUTHORIZED : ERROR_CODES.FORBIDDEN)
    }

    return createPlayback({ now: Date.now(), secret: env.AUTH_SECRET, video: row })
  })

export const lessonPlaybackQuery = (input: Lesson["getLessonPlayback"]) =>
  queryOptions({
    queryFn: () => getLessonPlayback({ data: input }),
    queryKey: [...LESSON_QUERY_KEYS.PLAYBACK, input.courseSlug, input.lessonSlug],
  })
