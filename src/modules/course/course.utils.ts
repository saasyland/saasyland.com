import type { Course } from "~/src/modules/course/course.types"

type Lesson = Course["pageLesson"]

const NEXT = 1

export const courseLessons = (page: Course["page"]): Lesson[] => page.chapters.flatMap(({ lessons }) => lessons)

export const nextLessonToWatch = (lessons: readonly Lesson[]): Lesson | undefined =>
  lessons.find((lesson) => !lesson.locked && !lesson.completed) ?? lessons.find((lesson) => !lesson.locked)

export const locateLesson = (lessons: readonly Lesson[], slug: string) => {
  const index = lessons.findIndex((lesson) => lesson.slug === slug)

  return { lesson: lessons[index], next: lessons[index + NEXT], previous: lessons[index - NEXT] }
}
