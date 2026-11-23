import * as zod from "zod"

import { COURSE_COVER_SIZE, courseCoverImage, coverContentType } from "~/src/modules/course/course.cover"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"

import type { ShareImage } from "~/src/lib/seo"

type Lesson = Course["pageLesson"]

export const courseLessons = (page: Course["page"]): Lesson[] => page.chapters.flatMap(({ lessons }) => lessons)

export const isAvailable = (lesson: Pick<Lesson, "locked" | "recording">): boolean => !lesson.locked && !lesson.recording

export const isPlayable = (lesson: Pick<Lesson, "format" | "locked" | "recording">): boolean =>
  lesson.format === LESSON_FORMAT.VIDEO && isAvailable(lesson)

export const nextLessonToWatch = (lessons: readonly Lesson[]): Lesson | undefined => {
  const available = lessons.filter((lesson) => isAvailable(lesson))

  return available.find((lesson) => !lesson.completed) ?? available[0]
}

export const locateLesson = (lessons: readonly Lesson[], slug: string) => {
  const index = lessons.findIndex((lesson) => lesson.slug === slug)

  return { lesson: lessons[index], next: lessons[index + 1], previous: lessons[index - 1] }
}

export const findEditorLesson = (editor: Course["editor"], lessonId: string): Course["editorLesson"] | undefined =>
  editor.chapters.flatMap(({ lessons }) => lessons).find((lesson) => lesson.id === lessonId)

const shareImageSchema = zod.object({ cover: zod.string(), title: zod.string() }).transform(({ cover, title }, context): ShareImage => {
  const type = coverContentType(cover)
  if (type === undefined) {
    context.addIssue({ code: "custom", input: cover, message: "coverTypeUnknown" })
    return zod.NEVER
  }

  return { alt: title, height: COURSE_COVER_SIZE.height, path: courseCoverImage(cover).src, type, width: COURSE_COVER_SIZE.width }
})

export const courseShareImage = (course: { readonly cover: string | null; readonly title: string }): ShareImage | undefined =>
  shareImageSchema.safeParse(course).data
