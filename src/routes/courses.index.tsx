import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import { pageHead } from "~/src/lib/seo"

import { CourseCard } from "~/src/presentation/components/custom/courses/course-card"
import { CataloguePending } from "~/src/presentation/components/custom/courses/courses-pending"

import { ROUTES } from "~/src/routes"

const CoursesPage = (): JSX.Element => {
  const t = useTranslations("pages.courses")
  const locale = getCurrentLocale()

  const { data: courses } = useSuspenseQuery(catalogueQuery({ locale }))

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <h1 className="max-w-[14ch] text-headline-peak text-balance text-foreground">{t("catalogue.title")}</h1>
        <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("catalogue.description")}</p>

        {courses.length === 0 && (
          <p className="mt-14 border-y border-border py-10 text-body text-muted-foreground md:mt-20">{t("catalogue.empty")}</p>
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
      </div>
    </section>
  )
}

const NAMESPACE = "pages.courses"

export const Route = createFileRoute("/courses/")({
  component: CoursesPage,
  head: pageHead(ROUTES.COURSES),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...catalogueQuery({ locale }), staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: CataloguePending,
  staticData: { namespaces: [NAMESPACE] },
})
