import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import type { LessonProgress } from "~/src/modules/lesson-progress/lesson-progress.types"
import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { CourseProgress } from "~/src/presentation/components/custom/admin/courses/course-progress"

import dashboardMessages from "~/messages/en-US/dashboard.courses.json"

const labels = dashboardMessages.progress

const courseRow = (overrides: Partial<LessonProgress["courseProgress"]> = {}): LessonProgress["courseProgress"] => ({
  completedLessons: 1250,
  finished: 3,
  id: "walkthrough",
  learners: 12,
  lessons: 40,
  title: { "en-US": "The walkthrough", "pl-PL": "Przewodnik" },
  ...overrides,
})

const renderPanel = (rows: LessonProgress["courseProgress"][]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(courseProgressQuery.queryKey, { learners: 12, rows })
  return renderAdmin(<CourseProgress />, { queryClient })
}

describe("course progress panel", () => {
  it("lists each course with its lessons, learners, finishers and completed lessons", () => {
    renderPanel([courseRow()])

    const [header, row] = within(screen.getByRole("table")).getAllByRole("row")
    expect(
      within(header ?? document.body)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toStrictEqual([
      labels.columns.course,
      labels.columns.lessons,
      labels.columns.learners,
      labels.columns.finished,
      labels.columns.completedLessons,
    ])
    expect(
      within(row ?? document.body)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toStrictEqual(["The walkthrough", "40", "12", "3", "1,250"])
  })

  it("says so before any course exists", () => {
    renderPanel([])

    expect(screen.getByRole("heading", { level: 2, name: labels.title })).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent(labels.empty)
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(1)
  })
})
