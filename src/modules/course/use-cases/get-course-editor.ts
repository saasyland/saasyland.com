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
import { VIDEO_UPLOAD_POLL_MS, VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"
import { uploadedBytes } from "~/src/modules/video-upload/video-upload.files"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import { video } from "~/src/modules/video/video.schema"

const readLessons = (courseId: string) =>
  db
    .select({
      access: lesson.access,
      chapterId: lesson.chapterId,
      description: lesson.description,
      format: lesson.format,
      id: lesson.id,
      keyMoments: lesson.keyMoments,
      position: lesson.position,
      slug: lesson.slug,
      status: lesson.status,
      summary: lesson.summary,
      title: lesson.title,
      upload: {
        createdAt: videoUpload.createdAt,
        failure: videoUpload.failure,
        fileName: videoUpload.fileName,
        id: videoUpload.id,
        partBytes: videoUpload.partBytes,
        parts: videoUpload.parts,
        sizeBytes: videoUpload.sizeBytes,
        status: videoUpload.status,
      },
      video: {
        captionLocales: video.captionLocales,
        durationMs: video.durationMs,
        height: video.height,
        id: video.id,
        lessonCount: db.$count(lesson, eq(lesson.videoId, video.id)),
        sizeBytes: video.sizeBytes,
        title: video.title,
        width: video.width,
      },
    })
    .from(lesson)
    .leftJoin(video, eq(video.id, lesson.videoId))
    .leftJoin(videoUpload, eq(videoUpload.lessonId, lesson.id))
    .where(eq(lesson.courseId, courseId))
    .orderBy(asc(lesson.position), asc(lesson.id))

const readAttachments = (courseId: string) =>
  db
    .select({ attachment: lessonAttachment })
    .from(lessonAttachment)
    .innerJoin(lesson, eq(lesson.id, lessonAttachment.lessonId))
    .where(eq(lesson.courseId, courseId))
    .orderBy(asc(lessonAttachment.position), asc(lessonAttachment.id))

const editorUpload = ({
  partBytes,
  parts,
  sizeBytes,
  ...upload
}: NonNullable<Awaited<ReturnType<typeof readLessons>>[number]["upload"]>) => ({
  ...upload,
  sizeBytes,
  uploadedBytes: uploadedBytes({ partBytes, parts, sizeBytes }),
})

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
      lessons.map(({ upload, ...entry }) =>
        Object.assign(entry, {
          attachments: attachmentsByLesson.get(entry.id) ?? [],
          ...(upload !== null && { upload: editorUpload(upload) }),
        }),
      ),
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

const ENCODER_STATUSES = new Set<string>([VIDEO_UPLOAD_STATUS.QUEUED, VIDEO_UPLOAD_STATUS.ENCODING])

const awaitsEncoder = (editor: Awaited<ReturnType<typeof getCourseEditor>> | undefined): boolean =>
  editor?.chapters.some(({ lessons }) => lessons.some(({ upload }) => upload !== undefined && ENCODER_STATUSES.has(upload.status))) ?? false

export const courseEditorQuery = (input: Course["getCourseEditor"]) =>
  queryOptions({
    queryFn: () => getCourseEditor({ data: input }),
    queryKey: [...COURSE_QUERY_KEYS.EDITOR, input.courseId],
    refetchInterval: (query) => (awaitsEncoder(query.state.data) ? VIDEO_UPLOAD_POLL_MS : false),
    staleTime: COURSE_STALE_MS,
  })
