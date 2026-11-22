import { lessonTitleQuery } from "~/src/modules/lesson/use-cases/get-lesson-title"

import type { OpenedLessonTitle } from "~/src/data/opened-lesson"

import { OpenedLessonName } from "~/src/presentation/components/custom/admin/courses/opened-lesson-name"

export const COURSES_OPENED_LESSON = [
  {
    Title: OpenedLessonName,
    key: "lessonTitle",
    load: ({ lessonId, queryClient }) => queryClient.query(lessonTitleQuery({ lessonId })),
  },
] as const satisfies readonly OpenedLessonTitle[]
