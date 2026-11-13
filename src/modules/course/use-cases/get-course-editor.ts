import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { COURSE_QUERY_KEYS, COURSE_STALE_MS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

const SINGLE_ROW_LIMIT = 1

const readLessons = (courseId: string) =>
  db
    .select({
      access: lesson.access,
      chapterId: lesson.chapterId,
      id: lesson.id,
      position: lesson.position,
      slug: lesson.slug,
      status: lesson.status,
      summary: lesson.summary,
      title: lesson.title,
      video: { durationMs: video.durationMs, id: video.id, title: video.title },
    })
    .from(lesson)
    .leftJoin(video, eq(video.id, lesson.videoId))
    .where(eq(lesson.courseId, courseId))
    .orderBy(asc(lesson.position), asc(lesson.id))

export const getCourseEditor = createServerFn({ method: "GET" })
  .middleware([authorized({ course: ["read"] })])
  .validator((input: Course["getCourseEditor"]) => courseZodSchemas.getCourseEditor.parse(input))
  .handler(async ({ data: { courseId } }) => {
    const [row] = await db.select().from(course).where(eq(course.id, courseId)).limit(SINGLE_ROW_LIMIT)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const [chapters, lessons] = await Promise.all([
      db.select().from(chapter).where(eq(chapter.courseId, courseId)).orderBy(asc(chapter.position), asc(chapter.id)),
      readLessons(courseId),
    ])
    const lessonsByChapter = Map.groupBy(lessons, (entry) => entry.chapterId)

    return {
      chapters: chapters.map((entry) => ({
        id: entry.id,
        lessons: lessonsByChapter.get(entry.id) ?? [],
        position: entry.position,
        title: entry.title,
      })),
      course: row,
    }
  })

export const courseEditorQuery = (input: Course["getCourseEditor"]) =>
  queryOptions({
    queryFn: () => getCourseEditor({ data: input }),
    queryKey: [...COURSE_QUERY_KEYS.EDITOR, input.courseId],
    staleTime: COURSE_STALE_MS,
  })
