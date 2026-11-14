import { type ReactElement, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { TEST_COURSE_ACCESS } from "~/src/modules/course/__test__/fixtures/course-access"
import { COURSE_KIND } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import { COURSES_LICENSE_OFFER } from "~/src/data/courses.license-offer"

import { CourseUnlocks, CourseUnlocksPending } from "~/src/presentation/components/custom/app/course-unlocks"

import messages from "~/messages/en-US/components.custom.course-unlocks.json"

vi.mock("~/src/data/course-access.entries", () => import("~/src/modules/course/__test__/fixtures/course-access"))

const [
  {
    includedWith: [PASS_KEY],
  },
] = TEST_COURSE_ACCESS
const PASS_NAME = "Course pass"
const CATALOGUE_KEY = catalogueQuery({ locale: I18N.DEFAULT_LOCALE }).queryKey

const course = (id: string, paid: number): Course["catalogue"][number] => ({
  durationMs: 0,
  id,
  kind: COURSE_KIND.COURSE,
  lessons: paid + 1,
  paid,
  previews: 1,
  slug: id,
  summary: id,
  title: `Course ${id}`,
})

const render = (ui: ReactElement, catalogue?: Course["catalogue"]) => {
  const queryClient = new QueryClient()
  if (catalogue !== undefined) {
    queryClient.setQueryData(CATALOGUE_KEY, catalogue)
  }
  return renderWithRouter(
    <IntlProvider
      formats={I18N.FORMATS}
      locale={I18N.DEFAULT_LOCALE}
      messages={{ ...getTestMessages(I18N.DEFAULT_LOCALE), [PASS_KEY]: PASS_NAME }}
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

    const region = screen.getByRole("region", { name: messages.title.replace("{includedWith}", PASS_NAME) })
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

  it("adds the panel to the licence offer and loads the catalogue with the page", async () => {
    const queryClient = new QueryClient()
    const query = vi.spyOn(queryClient, "query").mockResolvedValue([])
    const [section] = COURSES_LICENSE_OFFER

    await section.load({ locale: I18N.DEFAULT_LOCALE, queryClient })

    expect(section).toMatchObject({ Pending: CourseUnlocksPending, Section: CourseUnlocks })
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ queryKey: CATALOGUE_KEY }))
  })
})
