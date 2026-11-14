import { type JSX, useId } from "react"

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Lock } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import { COURSE_ACCESS_GRANTS } from "~/src/data/course-access"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const CourseUnlocks = (): JSX.Element | undefined => {
  const tGrant = useTranslations()
  const t = useTranslations("components.custom.course-unlocks")
  const format = useFormatter()
  const headingId = useId()

  const { data: courses } = useSuspenseQuery(catalogueQuery({ locale: getCurrentLocale() }))

  const locked = courses.filter(({ paid }) => paid > 0)

  if (locked.length === 0) {
    return undefined
  }

  const includedWith = format.list(COURSE_ACCESS_GRANTS.flatMap((grant) => grant.includedWith).map((key) => tGrant(key)))
  const lessons = locked.reduce((total, { paid }) => total + paid, 0)

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-card p-6 md:p-8">
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

export const CourseUnlocksPending = (): JSX.Element | undefined => {
  const queryClient = useQueryClient()

  const catalogue = queryClient.getQueryData(catalogueQuery({ locale: getCurrentLocale() }).queryKey) ?? []
  const courses = catalogue.filter(({ paid }) => paid > 0).length

  if (courses === 0) {
    return undefined
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 md:p-8">
      <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-title" />
      <div className="mt-1.5 flex w-full flex-col text-body-sm">
        <Skeleton className="h-lh w-full max-w-[60ch] scale-y-70" />
        <Skeleton className="h-lh w-2/3 scale-y-70 sm:hidden" />
      </div>
      <div className="mt-5 divide-y divide-border border-y border-border">
        {Array.from({ length: courses }, (_, course) => (
          <div className="flex items-center gap-3 py-3.5 text-body-sm" key={course}>
            <Skeleton className="size-3.5 shrink-0" />
            <Skeleton className="h-lh w-48 scale-y-70" />
          </div>
        ))}
      </div>
    </div>
  )
}
