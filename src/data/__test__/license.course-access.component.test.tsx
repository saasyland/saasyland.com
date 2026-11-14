import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_KIND } from "~/src/modules/course/course.constants"
import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import { CourseUnlocks } from "~/src/presentation/components/custom/app/course-unlocks"

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

afterEach(cleanup)

it.each([
  ["en-US", "Courses included with Complete and Agency"],
  ["pl-PL", "Kursy w pakietach Komplet i Agencja"],
] as const)("names the tiers that include the courses in %s", (locale: SupportedLocale, name) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(catalogueQuery({ locale: I18N.DEFAULT_LOCALE }).queryKey, CATALOGUE)

  renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale={locale} messages={getTestMessages(locale)} timeZone={I18N.DEFAULT_TIMEZONE}>
      <Suspense>
        <CourseUnlocks />
      </Suspense>
    </IntlProvider>,
    { queryClient },
  )

  expect(screen.getByRole("region", { name })).toBeVisible()
})
