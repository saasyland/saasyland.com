import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq } from "drizzle-orm"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { localize } from "~/src/modules/_core/utils/localized-text"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { COURSE_QUERY_KEYS, COURSE_STALE_MS, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { hasLessonAccess } from "~/src/modules/lesson/lesson.access"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { resolveViewer } from "~/src/modules/lesson/lesson.viewer"
import { video } from "~/src/modules/video/video.schema"

const SINGLE_ROW_LIMIT = 1

const readChapters = (courseId: string) =>
  db.select().from(chapter).where(eq(chapter.courseId, courseId)).orderBy(asc(chapter.position), asc(chapter.id))

const readLessons = (courseId: string) =>
  db
    .select({
      access: lesson.access,
      chapterId: lesson.chapterId,
      durationMs: video.durationMs,
      id: lesson.id,
      slug: lesson.slug,
      summary: lesson.summary,
      title: lesson.title,
    })
    .from(lesson)
    .leftJoin(video, eq(video.id, lesson.videoId))
    .where(and(eq(lesson.courseId, courseId), eq(lesson.status, LESSON_STATUS.PUBLISHED)))
    .orderBy(asc(lesson.position), asc(lesson.id))

const readProgress = (userId: string | undefined, courseId: string) => {
  if (userId === undefined) {
    return Promise.resolve([])
  }

  return db
    .select({ completedAt: lessonProgress.completedAt, lessonId: lessonProgress.lessonId, positionMs: lessonProgress.positionMs })
    .from(lessonProgress)
    .innerJoin(lesson, eq(lesson.id, lessonProgress.lessonId))
    .where(and(eq(lessonProgress.userId, userId), eq(lesson.courseId, courseId)))
}

const toProgressEntry = (entry: Awaited<ReturnType<typeof readProgress>>[number]) =>
  [entry.lessonId, { completed: entry.completedAt !== null, positionMs: entry.positionMs }] as const

export const getCourse = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: Course["getCourse"]) => courseZodSchemas.getCourse.parse(input))
  .handler(async ({ data: { locale, slug } }) => {
    const [row] = await db
      .select()
      .from(course)
      .where(and(eq(course.slug, slug), eq(course.status, COURSE_STATUS.PUBLISHED)))
      .limit(SINGLE_ROW_LIMIT)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const viewer = await resolveViewer()
    const [chapters, lessons, progress] = await Promise.all([
      readChapters(row.id),
      readLessons(row.id),
      readProgress(viewer.userId, row.id),
    ])

    const progressByLesson = new Map(progress.map((entry) => toProgressEntry(entry)))
    const lessonsByChapter = Map.groupBy(
      lessons.map((entry) => ({
        access: entry.access,
        chapterId: entry.chapterId,
        completed: progressByLesson.get(entry.id)?.completed ?? false,
        durationMs: entry.durationMs,
        id: entry.id,
        locked: !hasLessonAccess(entry.access, viewer),
        positionMs: progressByLesson.get(entry.id)?.positionMs ?? 0,
        slug: entry.slug,
        summary: localize(entry.summary, locale),
        title: localize(entry.title, locale),
      })),
      (entry) => entry.chapterId,
    )

    return {
      chapters: chapters.map((entry) => ({
        id: entry.id,
        lessons: lessonsByChapter.get(entry.id) ?? [],
        title: localize(entry.title, locale),
      })),
      course: { id: row.id, kind: row.kind, slug: row.slug, summary: localize(row.summary, locale), title: localize(row.title, locale) },
      viewer: { licensed: viewer.licensed, signedIn: viewer.userId !== undefined },
    }
  })

export const courseQuery = (input: Course["getCourse"]) =>
  queryOptions({
    queryFn: () => getCourse({ data: input }),
    queryKey: [...COURSE_QUERY_KEYS.DETAIL, input.locale, input.slug],
    staleTime: COURSE_STALE_MS,
  })
