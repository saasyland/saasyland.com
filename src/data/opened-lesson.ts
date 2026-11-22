import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"

import * as AREA_OPENED_LESSON from "~/src/data/opened-lesson.entries"

export interface OpenedLessonTitle {
  readonly key: string
  readonly load: (context: { readonly lessonId: string; readonly queryClient: QueryClient }) => Promise<unknown>
  readonly Title: (props: { readonly lessonId: string }) => JSX.Element | undefined
}

const AREAS: Readonly<Record<string, readonly OpenedLessonTitle[]>> = AREA_OPENED_LESSON

export const OPENED_LESSON_TITLES = Object.values(AREAS).flat()
