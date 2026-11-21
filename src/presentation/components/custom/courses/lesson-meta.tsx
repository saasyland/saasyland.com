import type { JSX } from "react"

import { Hourglass } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"

import { cn } from "~/src/lib/cn"
import { formatClock } from "~/src/lib/duration"

type MetaLesson = Pick<Course["pageLesson"], "access" | "durationMs" | "locked">

interface LessonMetaProps {
  readonly className?: string
  readonly compact?: boolean
  readonly lesson: MetaLesson
}

const LessonLength = ({ durationMs }: { readonly durationMs: number | null }): JSX.Element => {
  const t = useTranslations("components.custom.lesson-meta")

  if (durationMs === null) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Hourglass aria-hidden className="size-2.5 shrink-0" />
        <span className="truncate" data-slot="lesson-coming">
          {t("coming")}
        </span>
      </span>
    )
  }

  return <span className="tabular-nums">{formatClock(durationMs)}</span>
}

export const LessonMeta = ({ className, compact = false, lesson }: LessonMetaProps): JSX.Element => {
  const t = useTranslations("components.custom.lesson-meta")

  const { offer } = useCourseAccessNames()

  return (
    <span
      className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-spec whitespace-nowrap text-muted-foreground", className)}
    >
      {lesson.locked && <span className="sr-only">{t(`locked.${lesson.access}`, { offer })} </span>}
      {!compact && (
        <span
          aria-hidden={lesson.locked}
          className={cn("shrink-0 rounded-md border px-2 py-0.5 leading-none font-medium", {
            "border-border": lesson.access === LESSON_ACCESS.ACCOUNT,
            "border-ring/40 text-ring dark:bg-ring/10": lesson.access === LESSON_ACCESS.PREVIEW,
            "border-transparent bg-muted": lesson.access === LESSON_ACCESS.PAID,
          })}
        >
          {t(`access.${lesson.access}`, { offer })}
        </span>
      )}{" "}
      <LessonLength durationMs={lesson.durationMs} />
    </span>
  )
}
