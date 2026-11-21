import "@tanstack/react-start/server-only"

import { and, asc, eq, inArray } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { localize, localizeList } from "~/src/modules/_core/utils/localized-text"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import type { Course } from "~/src/modules/course/course.types"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { type Viewer, hasLessonAccess } from "~/src/modules/lesson/lesson.access"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { playableVideo } from "~/src/modules/lesson/lesson.playable"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

const readChapters = (courseId: string) =>
  db.select().from(chapter).where(eq(chapter.courseId, courseId)).orderBy(asc(chapter.position), asc(chapter.id))

const readLessons = (courseId: string) =>
  db
    .select({
      access: lesson.access,
      captionLocales: video.captionLocales,
      chapterId: lesson.chapterId,
      durationMs: video.durationMs,
      id: lesson.id,
      slug: lesson.slug,
      summary: lesson.summary,
      title: lesson.title,
    })
    .from(lesson)
    .leftJoin(video, playableVideo)
    .where(and(eq(lesson.courseId, courseId), eq(lesson.status, LESSON_STATUS.PUBLISHED)))
    .orderBy(asc(lesson.position), asc(lesson.id))

const readMaterials = (courseId: string): Promise<number> => {
  const published = and(eq(lesson.courseId, courseId), eq(lesson.status, LESSON_STATUS.PUBLISHED))
  const lessons = db.select({ id: lesson.id }).from(lesson).where(published)

  return db.$count(lessonAttachment, inArray(lessonAttachment.lessonId, lessons))
}

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

interface OutlineRequest {
  readonly course: Course["select"]
  readonly locale: SupportedLocale
  readonly viewer: Viewer
}

export const readCourseOutline = async ({ course, locale, viewer }: OutlineRequest) => {
  const [chapters, lessons, materials, progress] = await Promise.all([
    readChapters(course.id),
    readLessons(course.id),
    readMaterials(course.id),
    readProgress(viewer.userId, course.id),
  ])

  const progressByLesson = new Map(progress.map((entry) => toProgressEntry(entry)))
  const lessonsByChapter = Map.groupBy(
    lessons.map((entry) => ({
      access: entry.access,
      captioned: (entry.captionLocales?.length ?? 0) > 0,
      chapterId: entry.chapterId,
      completed: progressByLesson.get(entry.id)?.completed ?? false,
      durationMs: entry.durationMs,
      id: entry.id,
      locked: !hasLessonAccess(entry.access, viewer),
      positionMs: progressByLesson.get(entry.id)?.positionMs ?? 0,
      recording: entry.durationMs === null,
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
      summary: localize(entry.summary, locale),
      title: localize(entry.title, locale),
    })),
    course: {
      icon: course.icon,
      id: course.id,
      kind: course.kind,
      level: course.level,
      materials,
      outcomes: localizeList(course.outcomes, locale),
      prerequisites: localizeList(course.prerequisites, locale),
      slug: course.slug,
      summary: localize(course.summary, locale),
      title: localize(course.title, locale),
    },
    viewer: { mustConfirmEmail: viewer.mustConfirmEmail, signedIn: viewer.userId !== undefined },
  }
}
