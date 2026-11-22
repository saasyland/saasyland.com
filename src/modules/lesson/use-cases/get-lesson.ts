import { env } from "cloudflare:workers"

import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq } from "drizzle-orm"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { readCourseOutline } from "~/src/modules/course/course.outline"
import { course } from "~/src/modules/course/course.schema"
import { courseLessons, locateLesson } from "~/src/modules/course/course.utils"
import { LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { signDownload } from "~/src/modules/lesson-attachment/lesson-attachment.download"
import { attachmentFileNameOf } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import type { LessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.types"
import { attachmentTarget } from "~/src/modules/lesson-attachment/lesson-attachment.utils"
import { LESSON_QUERY_KEYS, LESSON_STALE_MS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { playableVideo } from "~/src/modules/lesson/lesson.playable"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { recordPaidLessonOpened, resolveViewer } from "~/src/modules/lesson/lesson.viewer"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { video } from "~/src/modules/video/video.schema"

const readDetails = ({ courseId, lessonSlug }: { readonly courseId: string; readonly lessonSlug: string }) =>
  db
    .select({ captionLocales: video.captionLocales, description: lesson.description, keyMoments: lesson.keyMoments })
    .from(lesson)
    .leftJoin(video, playableVideo)
    .where(and(eq(lesson.courseId, courseId), eq(lesson.slug, lessonSlug), eq(lesson.status, LESSON_STATUS.PUBLISHED)))
    .limit(1)

const readAttachments = ({ courseId, lessonSlug }: { readonly courseId: string; readonly lessonSlug: string }) =>
  db
    .select({ attachment: lessonAttachment })
    .from(lessonAttachment)
    .innerJoin(lesson, eq(lesson.id, lessonAttachment.lessonId))
    .where(and(eq(lesson.courseId, courseId), eq(lesson.slug, lessonSlug)))
    .orderBy(asc(lessonAttachment.position), asc(lessonAttachment.id))

interface AttachmentView {
  readonly attachment: LessonAttachment["select"]
  readonly locale: SupportedLocale
  readonly unlocked: boolean
}

const publicAttachment = async ({ attachment, locale, unlocked }: AttachmentView) => {
  const target = attachmentTarget(attachment)
  const title = localize(attachment.title, locale)

  if (target.kind === LESSON_ATTACHMENT_KIND.LINK) {
    return { href: unlocked ? target.url : undefined, id: attachment.id, kind: target.kind, title }
  }

  const file = {
    contentType: target.contentType,
    fileName: attachmentFileNameOf(target.objectKey),
    id: attachment.id,
    kind: target.kind,
    sizeBytes: target.sizeBytes,
    title,
  }

  if (!unlocked) {
    return { ...file, href: undefined }
  }

  return {
    ...file,
    href: await signDownload({ attachmentId: attachment.id, now: Date.now(), objectKey: target.objectKey, secret: env.AUTH_SECRET }),
  }
}

export const getLesson = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: Lesson["getLesson"]) => lessonZodSchemas.getLesson.parse(input))
  .handler(async ({ data: { courseSlug, lessonSlug, locale } }) => {
    const [row] = await db
      .select()
      .from(course)
      .where(and(eq(course.slug, courseSlug), eq(course.status, COURSE_STATUS.PUBLISHED)))
      .limit(1)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const viewer = await resolveViewer()
    const [outline, [details], attachments] = await Promise.all([
      readCourseOutline({ course: row, locale, viewer }),
      readDetails({ courseId: row.id, lessonSlug }),
      readAttachments({ courseId: row.id, lessonSlug }),
    ])
    const { lesson: entry, next, previous } = locateLesson(courseLessons(outline), lessonSlug)

    if (entry === undefined || details === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const [lessonAttachments] = await Promise.all([
      Promise.all(attachments.map(({ attachment }) => publicAttachment({ attachment, locale, unlocked: !entry.locked }))),
      recordPaidLessonOpened(entry, viewer),
    ])

    return {
      ...outline,
      lesson: {
        ...entry,
        attachments: lessonAttachments,
        captionLocales: details.captionLocales ?? [],
        description: localize(details.description, locale),
        keyMoments: details.keyMoments.map(({ label, seconds }) => ({ label: localize(label, locale), seconds })),
      },
      next,
      previous,
    }
  })

export const lessonQuery = (input: Lesson["getLesson"]) =>
  queryOptions({
    queryFn: () => getLesson({ data: input }),
    queryKey: [...LESSON_QUERY_KEYS.DETAIL, input.locale, input.courseSlug, input.lessonSlug],
    staleTime: LESSON_STALE_MS,
  })
