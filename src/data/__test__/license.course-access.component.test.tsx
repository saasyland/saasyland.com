import { type JSX, type ReactElement, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_KIND } from "~/src/modules/course/course.constants"
import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"

import { CourseUnlocks } from "~/src/presentation/components/custom/app/course-unlocks"
import { LockedLesson } from "~/src/presentation/components/custom/courses/locked-lesson"

import { ROUTES } from "~/src/routes"

const CATALOGUE = [
  {
    durationMs: 0,
    id: "walkthrough",
    kind: COURSE_KIND.COURSE,
    lessons: 4,
    paid: 2,
    previews: 1,
    slug: "the-walkthrough",
    summary: "How it works.",
    title: "The walkthrough",
  },
]

const Names = (): JSX.Element => {
  const { holders, offer } = useCourseAccessNames()

  return (
    <>
      <p>{holders}</p>
      <p>{offer}</p>
    </>
  )
}

const renderIn = (locale: SupportedLocale, ui: ReactElement) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(catalogueQuery({ locale: I18N.DEFAULT_LOCALE }).queryKey, CATALOGUE)

  return renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale={locale} messages={getTestMessages(locale)} timeZone={I18N.DEFAULT_TIMEZONE}>
      <Suspense>{ui}</Suspense>
    </IntlProvider>,
    { queryClient },
  )
}

afterEach(cleanup)

describe("the licence's names in the course copy", () => {
  it.each([
    ["en-US", "Courses included with Complete and Agency"],
    ["pl-PL", "Kursy w pakietach Komplet i Agencja"],
  ] as const)("names the tiers that include the courses in %s", (locale, name) => {
    renderIn(locale, <CourseUnlocks />)

    expect(screen.getByRole("region", { name })).toBeVisible()
  })

  it.each([
    ["en-US", "Complete and Agency licences", "Complete"],
    ["pl-PL", "Licencje Komplet i Agencja", "Komplet"],
  ] as const)("names the licences that hold access and the tier on offer in %s", (locale, holders, offer) => {
    renderIn(locale, <Names />)

    expect(screen.getByText(holders)).toBeVisible()
    expect(screen.getByText(offer, { exact: true })).toBeVisible()
  })

  it.each([
    ["en-US", "This lesson comes with Complete", "Get Complete"],
    ["pl-PL", "Ta lekcja jest w pakiecie Komplet", "Wybierz Komplet"],
  ] as const)("offers Complete on a locked paid lesson in %s", (locale, title, cta) => {
    renderIn(locale, <LockedLesson access={LESSON_ACCESS.PAID} signedIn />)

    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getByRole("link", { name: cta })).toHaveAttribute("href", `${ROUTES.APP_LICENSE}?tier=${LICENSE_TIER.COMPLETE}`)
  })
})
