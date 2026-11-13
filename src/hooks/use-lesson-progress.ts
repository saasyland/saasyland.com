import { useCallback, useRef } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { saveLessonProgressMutation } from "~/src/modules/lesson-progress/use-cases/save-lesson-progress"

const SAVE_INTERVAL_MS = 15_000
const MILLISECONDS_PER_SECOND = 1000
const LESSON_START_MS = 0

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
        await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.DETAIL })
      }
    },
  })

  const save = useCallback(
    (seconds: number) => {
      const now = Date.now()
      if (!enabled || now - lastSavedAt.current < SAVE_INTERVAL_MS) {
        return
      }
      lastSavedAt.current = now
      mutate({ completed: false, lessonId, positionMs: Math.round(seconds * MILLISECONDS_PER_SECOND) })
    },
    [enabled, lessonId, mutate],
  )

  const complete = useCallback(() => {
    if (enabled) {
      mutate({ completed: true, lessonId, positionMs: LESSON_START_MS })
    }
  }, [enabled, lessonId, mutate])

  return { complete, save }
}
