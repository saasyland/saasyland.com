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
import { LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { attachmentFileNameOf } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import type { LessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.types"
import { attachmentTarget } from "~/src/modules/lesson-attachment/lesson-attachment.utils"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

const readLessons = (courseId: string) =>
  db
    .select({
      access: lesson.access,
      chapterId: lesson.chapterId,
      description: lesson.description,
      id: lesson.id,
      keyMoments: lesson.keyMoments,
      position: lesson.position,
      slug: lesson.slug,
      status: lesson.status,
      summary: lesson.summary,
      title: lesson.title,
      video: { durationMs: video.durationMs, id: video.id, placeholder: video.placeholder, title: video.title },
    })
    .from(lesson)
    .leftJoin(video, eq(video.id, lesson.videoId))
    .where(eq(lesson.courseId, courseId))
    .orderBy(asc(lesson.position), asc(lesson.id))

const readAttachments = (courseId: string) =>
  db
    .select({ attachment: lessonAttachment })
    .from(lessonAttachment)
    .innerJoin(lesson, eq(lesson.id, lessonAttachment.lessonId))
    .where(eq(lesson.courseId, courseId))
    .orderBy(asc(lessonAttachment.position), asc(lessonAttachment.id))

const editorAttachment = (attachment: LessonAttachment["select"]) => {
  const target = attachmentTarget(attachment)
  const fields = { id: attachment.id, lessonId: attachment.lessonId, position: attachment.position, title: attachment.title }

  if (target.kind === LESSON_ATTACHMENT_KIND.LINK) {
    return { ...fields, kind: target.kind, url: target.url }
  }

  return { ...fields, fileName: attachmentFileNameOf(target.objectKey), kind: target.kind, sizeBytes: target.sizeBytes }
}

export const getCourseEditor = createServerFn({ method: "GET" })
  .middleware([authorized({ course: ["read"] })])
  .validator((input: Course["getCourseEditor"]) => courseZodSchemas.getCourseEditor.parse(input))
  .handler(async ({ data: { courseId } }) => {
    const [row] = await db.select().from(course).where(eq(course.id, courseId)).limit(1)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const [chapters, lessons, attachments] = await Promise.all([
      db.select().from(chapter).where(eq(chapter.courseId, courseId)).orderBy(asc(chapter.position), asc(chapter.id)),
      readLessons(courseId),
      readAttachments(courseId),
    ])
    const attachmentsByLesson = Map.groupBy(
      attachments.map(({ attachment }) => editorAttachment(attachment)),
      (entry) => entry.lessonId,
    )
    const lessonsByChapter = Map.groupBy(
      lessons.map((entry) => Object.assign(entry, { attachments: attachmentsByLesson.get(entry.id) ?? [] })),
      (entry) => entry.chapterId,
    )

    return {
      chapters: chapters.map((entry) => ({
        id: entry.id,
        lessons: lessonsByChapter.get(entry.id) ?? [],
        position: entry.position,
        summary: entry.summary,
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
