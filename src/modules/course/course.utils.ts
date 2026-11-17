import type { Course } from "~/src/modules/course/course.types"

type Lesson = Course["pageLesson"]

export const courseLessons = (page: Course["page"]): Lesson[] => page.chapters.flatMap(({ lessons }) => lessons)

export const nextLessonToWatch = (lessons: readonly Lesson[]): Lesson | undefined =>
  lessons.find((lesson) => !lesson.locked && !lesson.completed) ?? lessons.find((lesson) => !lesson.locked)

export const locateLesson = (lessons: readonly Lesson[], slug: string) => {
  const index = lessons.findIndex((lesson) => lesson.slug === slug)

  return { lesson: lessons[index], next: lessons[index + 1], previous: lessons[index - 1] }
}

export const findEditorLesson = (editor: Course["editor"], lessonId: string): Course["editorLesson"] | undefined =>
  editor.chapters.flatMap(({ lessons }) => lessons).find((lesson) => lesson.id === lessonId)
