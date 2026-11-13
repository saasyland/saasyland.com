import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"

const MILLISECONDS_PER_MINUTE = 60_000

export const CourseCard = ({ course }: { readonly course: Course["catalogue"][number] }): JSX.Element => {
  const t = useTranslations("pages.courses")

  return (
    <Link
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-7 transition-colors duration-200 ease-exp hover:border-ring/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:p-9"
      params={{ course: course.slug }}
      to="/courses/$course"
    >
      <p className="flex items-center gap-2.5">
        <span aria-hidden className="size-1.25 shrink-0 rounded-xs bg-ring" />
        <span className="font-mono text-label text-ring uppercase">{t(`kinds.${course.kind}`)}</span>
      </p>
      <h2 className="mt-4 text-headline-support text-balance text-foreground">{course.title}</h2>
      <p className="mt-3 max-w-[60ch] flex-1 text-body text-pretty text-muted-foreground">{course.summary}</p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <p className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-spec text-muted-foreground">
          <span>{t("catalogue.lessons", { count: course.lessons })}</span>
          <span>{t("catalogue.minutes", { minutes: Math.round(course.durationMs / MILLISECONDS_PER_MINUTE) })}</span>
          <span className="text-ring">{t("catalogue.previews", { count: course.previews })}</span>
        </p>
        <ArrowRight
          aria-hidden
          className="size-4 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-0.5 group-hover:text-foreground"
        />
      </div>
    </Link>
  )
}
