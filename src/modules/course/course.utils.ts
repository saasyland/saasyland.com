import type { Course } from "~/src/modules/course/course.types"
import { LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"

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
