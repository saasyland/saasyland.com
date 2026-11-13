import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq, inArray } from "drizzle-orm"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { COURSE_QUERY_KEYS, COURSE_SHOWCASE, COURSE_STALE_MS, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

const readCourses = () =>
  db
    .select({ id: course.id, kind: course.kind, slug: course.slug, title: course.title })
    .from(course)
    .where(eq(course.status, COURSE_STATUS.PUBLISHED))
    .orderBy(asc(course.position), asc(course.id))
    .limit(COURSE_SHOWCASE.COURSES)

const readLessons = (courseIds: readonly string[]) =>
  db
    .select({
      access: lesson.access,
      courseId: lesson.courseId,
      courseSlug: course.slug,
      durationMs: video.durationMs,
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
    })
    .from(lesson)
    .innerJoin(course, eq(course.id, lesson.courseId))
    .innerJoin(chapter, eq(chapter.id, lesson.chapterId))
    .leftJoin(video, eq(video.id, lesson.videoId))
    .where(and(inArray(lesson.courseId, [...courseIds]), eq(lesson.status, LESSON_STATUS.PUBLISHED)))
    .orderBy(asc(course.position), asc(course.id), asc(chapter.position), asc(chapter.id), asc(lesson.position), asc(lesson.id))

export const getCourseShowcase = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: Course["getCourseShowcase"]) => courseZodSchemas.getCourseShowcase.parse(input))
  .handler(async ({ data: { locale } }) => {
    const courses = await readCourses()
    const lessons = await readLessons(courses.map(({ id }) => id))
    const lessonsByCourse = Map.groupBy(lessons, (entry) => entry.courseId)
    const freeLesson = lessons.find((entry) => entry.access === LESSON_ACCESS.PREVIEW && entry.durationMs !== null)

    return {
      courses: courses.map((entry) => {
        const own = lessonsByCourse.get(entry.id) ?? []

        return {
          durationMs: own.reduce((total, { durationMs }) => total + (durationMs ?? 0), 0),
          id: entry.id,
          kind: entry.kind,
          lessonCount: own.length,
          lessons: own
            .slice(0, COURSE_SHOWCASE.LESSONS)
            .map(({ access, durationMs, id, slug, title }) => ({ access, durationMs, id, slug, title: localize(title, locale) })),
          previewCount: own.filter(({ access }) => access === LESSON_ACCESS.PREVIEW).length,
          slug: entry.slug,
          title: localize(entry.title, locale),
        }
      }),
      freeLesson: freeLesson && { courseSlug: freeLesson.courseSlug, slug: freeLesson.slug, title: localize(freeLesson.title, locale) },
    }
  })

export const courseShowcaseQuery = (input: Course["getCourseShowcase"]) =>
  queryOptions({
    queryFn: () => getCourseShowcase({ data: input }),
    queryKey: [...COURSE_QUERY_KEYS.SHOWCASE, input.locale],
    staleTime: COURSE_STALE_MS,
  })
