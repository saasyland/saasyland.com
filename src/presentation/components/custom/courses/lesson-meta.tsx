import type { JSX } from "react"

import { Hourglass } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"

import { LESSON_ACCESS_BADGES } from "~/src/data/course-badges"

import { cn } from "~/src/lib/cn"
import { formatClock } from "~/src/lib/duration"

import { Badge } from "~/src/presentation/components/shadcn/badge"

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
        <Hourglass aria-hidden className="size-3 shrink-0" />
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
      className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-spec whitespace-nowrap text-muted-foreground", className)}
      data-slot="lesson-meta"
    >
      {lesson.locked && <span className="sr-only">{t(`locked.${lesson.access}`, { offer })} </span>}
      {!compact && (
        <Badge aria-hidden={lesson.locked} variant={LESSON_ACCESS_BADGES[lesson.access]}>
          {t(`access.${lesson.access}`, { offer })}
        </Badge>
      )}{" "}
      <LessonLength durationMs={lesson.durationMs} />
    </span>
  )
}
