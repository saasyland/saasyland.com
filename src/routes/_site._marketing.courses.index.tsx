import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"

import { pageHead } from "~/src/lib/seo"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { CourseCard } from "~/src/presentation/components/custom/courses/course-card"
import { CataloguePending } from "~/src/presentation/components/custom/courses/courses-pending"

import { ROUTES } from "~/src/routes"

const CoursesPage = (): JSX.Element => {
  const t = useTranslations("pages.courses")
  const locale = getCurrentLocale()

  const { offer } = useCourseAccessNames()
  const { data: courses } = useSuspenseQuery(catalogueQuery({ locale }))

  return (
    <ContentPage lead={t("catalogue.description", { offer })} title={t("catalogue.title")}>
      {courses.length === 0 && (
        <div className="mt-14 border-y border-border py-10 md:mt-20">
          <h2 className="text-title text-balance text-foreground">{t("catalogue.empty.title")}</h2>
          <p className="mt-2 max-w-2xl text-body text-pretty text-muted-foreground">{t("catalogue.empty.body")}</p>
        </div>
      )}

      {courses.length > 0 && (
        <ul className="mt-14 grid gap-6 md:mt-20 lg:grid-cols-2">
          {courses.map((course) => (
            <li key={course.id}>
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      )}
    </ContentPage>
  )
}

const NAMESPACE = "pages.courses"

export const Route = createFileRoute("/_site/_marketing/courses/")({
  component: CoursesPage,
  head: pageHead(ROUTES.COURSES),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query(catalogueQuery({ locale })),
    ])
    return { locale, metadata }
  },
  pendingComponent: CataloguePending,
  staticData: { namespaces: [NAMESPACE] },
})
