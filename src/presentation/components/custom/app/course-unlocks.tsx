import { type JSX, useId } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Lock } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { COURSE_LICENCE_TIERS } from "~/src/modules/lesson/lesson.access"

export const CourseUnlocks = (): JSX.Element | undefined => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license.unlocks")
  const format = useFormatter()
  const headingId = useId()

  const { data: courses } = useSuspenseQuery(catalogueQuery({ locale: getCurrentLocale() }))

  const locked = courses.filter(({ paid }) => paid > 0)

  if (locked.length === 0) {
    return undefined
  }

  const tiers = format.list([...COURSE_LICENCE_TIERS].map((tier) => tTier(`tiers.${tier}.name`)))
  const lessons = locked.reduce((total, { paid }) => total + paid, 0)

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-card p-6 md:p-8">
      <h3 className="text-title text-foreground" id={headingId}>
        {t("title", { tiers })}
      </h3>
      <p className="mt-1.5 max-w-[60ch] text-body-sm text-pretty text-muted-foreground">
        {t("description", { courses: locked.length, lessons })}
      </p>
      <ul className="mt-5 divide-y divide-border border-y border-border">
        {locked.map((course) => (
          <li key={course.id}>
            <Link
              className="group flex items-center gap-3 py-3.5 text-body-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              params={{ course: course.slug }}
              to="/courses/$course"
            >
              <Lock aria-hidden className="size-3.5 shrink-0 text-ring" strokeWidth={2.25} />
              <span className="min-w-0 flex-1 font-medium text-foreground">{course.title}</span>
              <span className="font-mono text-spec whitespace-nowrap text-muted-foreground">{t("lessons", { count: course.paid })}</span>
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
