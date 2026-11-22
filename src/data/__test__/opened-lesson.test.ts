import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { lessonTitleQuery } from "~/src/modules/lesson/use-cases/get-lesson-title"

import { COURSES_OPENED_LESSON } from "~/src/data/courses.opened-lesson"
import { LICENSE_OPENED_LESSON } from "~/src/data/license.opened-lesson"
import { OPENED_LESSON_TITLES, type OpenedLessonTitle } from "~/src/data/opened-lesson"
import * as AREA_OPENED_LESSON from "~/src/data/opened-lesson.entries"

import { OpenedLessonName } from "~/src/presentation/components/custom/admin/courses/opened-lesson-name"

const LESSON_ID = "lesson-billing"

const title = (key: string): OpenedLessonTitle => ({ Title: () => {}, key, load: () => Promise.resolve() })

const composeWith = (areas: Readonly<Record<string, readonly OpenedLessonTitle[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/opened-lesson.entries", () => areas)

  return import("~/src/data/opened-lesson")
}

afterEach(() => {
  vi.doUnmock("~/src/data/opened-lesson.entries")
  vi.restoreAllMocks()
})

describe("the title of the first paid lesson a licence opened", () => {
  it("adds the titles of every area once, each with its own key", () => {
    const declared = Object.values(AREA_OPENED_LESSON).flat()

    expect(OPENED_LESSON_TITLES).toStrictEqual(declared)
    expect(new Set(declared.map(({ key }) => key)).size).toBe(declared.length)
  })

  it("orders the titles by area, and has none when only the licence area is installed", async () => {
    const first = title("first")
    const second = title("second")

    await expect(composeWith({ FIRST: [first], SECOND: [second] })).resolves.toMatchObject({ OPENED_LESSON_TITLES: [first, second] })
    await expect(composeWith({ LICENSE_OPENED_LESSON })).resolves.toMatchObject({ OPENED_LESSON_TITLES: [] })
  })

  it("names the lesson and its course from the courses area", async () => {
    const queryClient = new QueryClient()
    const query = vi.spyOn(queryClient, "query").mockResolvedValue({ title: undefined })
    const [lessonTitle] = COURSES_OPENED_LESSON

    await lessonTitle.load({ lessonId: LESSON_ID, queryClient })

    expect(lessonTitle.Title).toBe(OpenedLessonName)
    expect(query.mock.calls.map(([options]) => options.queryKey)).toStrictEqual([lessonTitleQuery({ lessonId: LESSON_ID }).queryKey])
  })
})
