import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"

import { pageHead } from "~/src/lib/seo"

import { CourseCard, FeaturedCourseCard } from "~/src/presentation/components/custom/courses/course-card"
import { CataloguePending } from "~/src/presentation/components/custom/courses/courses-pending"
import { SignInInstead, UnlockLink } from "~/src/presentation/components/custom/courses/locked-lesson"

import * as ROUTES from "~/src/routes"

const CompleteBand = ({ signedIn }: { readonly signedIn: boolean }): JSX.Element => {
  const t = useTranslations("pages.courses.course.unlock")

  const { offer } = useCourseAccessNames()

  return (
    <aside className="mt-6 flex flex-col gap-8 overflow-hidden rounded-lg border border-ring/30 bg-radial-[ellipse_at_0%_0%] from-ring/14 via-card via-60% to-card p-8 md:flex-row md:items-center md:justify-between md:p-12">
      <div className="max-w-2xl">
        <h2 className="text-headline-support text-balance text-foreground">{t("title", { offer })}</h2>
        <p className="mt-3 text-body text-pretty text-muted-foreground">{t("body", { offer })}</p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-4 md:items-center">
        <div className="flex flex-wrap gap-3">
          <UnlockLink access={LESSON_ACCESS.PAID} signedIn={signedIn} />
        </div>
        {!signedIn && <SignInInstead access={LESSON_ACCESS.PAID} />}
      </div>
    </aside>
  )
}

const CoursesPage = (): JSX.Element => {
  const t = useTranslations("pages.courses")
  const locale = getCurrentLocale()

  const { offer } = useCourseAccessNames()
  const { data } = useSuspenseQuery(catalogueQuery({ locale }))

  const [featured, ...others] = data.courses
  const offersComplete = !data.viewer.unlocked && !data.viewer.mustConfirmEmail && data.courses.some((course) => course.paid > 0)

  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[44rem] bg-radial-[ellipse_70%_60%_at_15%_0%] from-ring/12 to-transparent"
      />
      <div className="mx-auto w-full max-w-site px-6 py-24 md:px-10 md:py-32">
        <h1 className="max-w-[20ch] text-headline-peak text-balance text-foreground">{t("catalogue.title")}</h1>
        <p className="mt-6 max-w-2xl text-lead text-pretty text-muted-foreground">{t("catalogue.description", { offer })}</p>

        {featured === undefined && (
          <div className="mt-14 border-y border-border py-10 md:mt-20">
            <h2 className="text-title text-balance text-foreground">{t("catalogue.empty.title")}</h2>
            <p className="mt-2 max-w-2xl text-body text-pretty text-muted-foreground">{t("catalogue.empty.body")}</p>
          </div>
        )}

        {featured !== undefined && (
          <div className="mt-14 md:mt-20">
            <FeaturedCourseCard course={featured} />
          </div>
        )}

        {others.length > 0 && (
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {others.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} />
              </li>
            ))}
          </ul>
        )}

        {offersComplete && <CompleteBand signedIn={data.viewer.signedIn} />}
      </div>
    </section>
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
