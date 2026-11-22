import { type JSX, useId } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Lock } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"

export const CourseUnlocks = (): JSX.Element | undefined => {
  const t = useTranslations("components.custom.course-unlocks")
  const headingId = useId()

  const { includedWith } = useCourseAccessNames()
  const { data } = useSuspenseQuery(catalogueQuery({ locale: getCurrentLocale() }))

  const locked = data.courses.filter(({ paid }) => paid > 0)

  if (locked.length === 0) {
    return undefined
  }

  const lessons = locked.reduce((total, { paid }) => total + paid, 0)

  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-border bg-card p-6 md:p-8">
      <h3 className="text-title text-foreground" id={headingId}>
        {t("title", { includedWith })}
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
              <span className="text-spec whitespace-nowrap text-muted-foreground">{t("lessons", { count: course.paid })}</span>
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
