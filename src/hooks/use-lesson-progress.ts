import { useCallback, useRef } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { LESSON_PROGRESS_QUERY_KEYS, LESSON_PROGRESS_SAVE_INTERVAL_MS } from "~/src/modules/lesson-progress/lesson-progress.constants"
import { saveLessonProgressMutation } from "~/src/modules/lesson-progress/use-cases/save-lesson-progress"
import { LESSON_QUERY_KEYS } from "~/src/modules/lesson/lesson.constants"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

interface LessonProgressOptions {
  readonly enabled: boolean
  readonly lessonId: string
}

export const useLessonProgress = ({ enabled, lessonId }: LessonProgressOptions) => {
  const queryClient = useQueryClient()
  const lastSavedAt = useRef(0)

  const { mutate } = useMutation({
    ...saveLessonProgressMutation,
    onSuccess: async ({ completed }) => {
      if (completed) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.DETAIL }),
          queryClient.invalidateQueries({ queryKey: LESSON_QUERY_KEYS.DETAIL }),
          queryClient.invalidateQueries({ queryKey: LESSON_PROGRESS_QUERY_KEYS.COMPLETED_LESSONS }),
        ])
      }
    },
  })

  const record = useCallback(
    (seconds: number) => {
      lastSavedAt.current = Date.now()
      mutate({ completed: false, lessonId, positionMs: Math.round(seconds * MILLISECONDS_PER_SECOND) })
    },
    [lessonId, mutate],
  )

  const save = useCallback(
    (seconds: number) => {
      if (enabled && Date.now() - lastSavedAt.current >= LESSON_PROGRESS_SAVE_INTERVAL_MS) {
        record(seconds)
      }
    },
    [enabled, record],
  )

  const pause = useCallback(
    (seconds: number) => {
      if (enabled) {
        record(seconds)
      }
    },
    [enabled, record],
  )

  const complete = useCallback(() => {
    if (enabled) {
      mutate({ completed: true, lessonId, positionMs: 0 })
    }
  }, [enabled, lessonId, mutate])

  return { complete, pause, save }
}
