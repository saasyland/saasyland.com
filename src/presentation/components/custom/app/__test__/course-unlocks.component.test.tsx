import { type ReactElement, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_ACCESS_TEST_MESSAGES, COURSE_ACCESS_TEST_NAMES } from "~/src/modules/course/__test__/fixtures/course-access.messages"
import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import { CourseUnlocks, CourseUnlocksPending } from "~/src/presentation/components/custom/app/course-unlocks"

import messages from "~/messages/en-US/components.custom.course-unlocks.json"

vi.mock("~/src/data/course-access.entries", () => import("~/src/modules/course/__test__/fixtures/course-access"))

const CATALOGUE_KEY = catalogueQuery({ locale: I18N.DEFAULT_LOCALE }).queryKey

const course = (id: string, paid: number): Course["catalogueCourse"] => ({
  completed: 0,
  cover: null,
  durationMs: 0,
  icon: COURSE_ICON.BOOK_OPEN,
  id,
  kind: COURSE_KIND.COURSE,
  lessons: paid + 1,
  level: COURSE_LEVEL.BEGINNER,
  paid,
  previews: 1,
  recorded: 0,
  slug: id,
  summary: id,
  title: `Course ${id}`,
})

const render = (ui: ReactElement, courses?: Course["catalogue"]["courses"]) => {
  const queryClient = new QueryClient()
  if (courses !== undefined) {
    queryClient.setQueryData(CATALOGUE_KEY, { courses, viewer: { mustConfirmEmail: false, signedIn: true, unlocked: false } })
  }
  return renderWithRouter(
    <IntlProvider
      formats={I18N.FORMATS}
      locale={I18N.DEFAULT_LOCALE}
      messages={{ ...getTestMessages(I18N.DEFAULT_LOCALE), ...COURSE_ACCESS_TEST_MESSAGES }}
      timeZone={I18N.DEFAULT_TIMEZONE}
    >
      <Suspense>{ui}</Suspense>
    </IntlProvider>,
    { queryClient },
  )
}

afterEach(cleanup)

describe("course unlocks", () => {
  it("lists the courses with paid lessons, names what includes them and counts the locked lessons", () => {
    render(<CourseUnlocks />, [course("a", 2), course("b", 0), course("c", 1)])

    const region = screen.getByRole("region", { name: messages.title.replace("{includedWith}", COURSE_ACCESS_TEST_NAMES.offer) })
    expect(within(region).getByText("Your account cannot open 3 lessons in 2 courses yet.")).toBeVisible()
    expect(within(region).getByRole("link", { name: /Course a\s*2 locked lessons/u })).toHaveAttribute("href", "/courses/a")
    expect(within(region).getByRole("link", { name: /Course c\s*1 locked lesson$/u })).toHaveAttribute("href", "/courses/c")
    expect(within(region).queryByRole("link", { name: /Course b/u })).toBeNull()
  })

  it("is left out while no course has a paid lesson", () => {
    const { container } = render(<CourseUnlocks />, [course("b", 0)])

    expect(container).toBeEmptyDOMElement()
  })

  it("mirrors one row per course with paid lessons in the cached catalogue, and nothing before the catalogue loads", () => {
    const { container } = render(<CourseUnlocksPending />, [course("a", 2), course("b", 0), course("c", 1)])

    expect(container.querySelectorAll(".divide-y > div")).toHaveLength(2)
    cleanup()
    expect(render(<CourseUnlocksPending />).container).toBeEmptyDOMElement()
  })
})
