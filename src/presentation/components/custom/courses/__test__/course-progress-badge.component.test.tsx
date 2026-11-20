import { screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { CourseProgressBadge } from "~/src/presentation/components/custom/courses/course-progress-badge"

const progressMock = vi.hoisted(() => vi.fn<() => Promise<{ completed: number; total: number }>>())

vi.mock(import("~/src/modules/lesson-progress/use-cases/get-completed-lessons"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, completedLessonsQuery: { ...actual.completedLessonsQuery, queryFn: progressMock } }
})

const renderBadge = () =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <CourseProgressBadge />
    </IntlProvider>,
  )

beforeEach(() => {
  progressMock.mockReset()
})

describe("course progress in the workspace navigation", () => {
  it("shows the lessons a learner has finished out of every lesson, and says so to screen readers", async () => {
    progressMock.mockResolvedValue({ completed: 3, total: 24 })
    renderBadge()

    expect(await screen.findByText("3/24")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText("3 of 24 lessons completed")).toHaveClass("sr-only")
  })

  it("shows nothing while it loads, when it fails or when no lesson is published", async () => {
    const pending = Promise.withResolvers<{ completed: number; total: number }>()
    progressMock.mockReturnValueOnce(pending.promise)
    const { container, unmount } = renderBadge()
    expect(container).toBeEmptyDOMElement()
    pending.resolve({ completed: 0, total: 0 })
    await waitFor(() => {
      expect(progressMock).toHaveBeenCalledOnce()
    })
    expect(container).toBeEmptyDOMElement()
    unmount()
  })
})
