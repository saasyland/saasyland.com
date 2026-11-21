import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"

import { cn } from "~/src/lib/cn"
import { wholeMinutes } from "~/src/lib/duration"

type Facts = Pick<Course["catalogueCourse"], "durationMs" | "lessons" | "previews" | "recorded">

export const RecordingNow = ({ className }: { readonly className?: string }): JSX.Element => {
  const t = useTranslations("components.custom.course-facts")

  return (
    <span className={cn("inline-flex items-center gap-2 text-ring", className)}>
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-ring/60 motion-safe:animate-ping" />
        <span className="relative size-2 rounded-full bg-ring" />
      </span>
      {t("recordingNow")}
    </span>
  )
}

export const CourseFacts = ({ className, course }: { readonly className?: string; readonly course: Facts }): JSX.Element => {
  const t = useTranslations("components.custom.course-facts")
  const isPartlyRecorded = course.recorded > 0 && course.recorded < course.lessons

  return (
    <span className={cn("flex flex-wrap gap-x-5 gap-y-2 text-spec whitespace-nowrap text-muted-foreground", className)}>
      {course.recorded === 0 && <RecordingNow />}
      {!isPartlyRecorded && <span>{t("lessons", { count: course.lessons })}</span>}
      {isPartlyRecorded && <span>{t("recorded", { recorded: course.recorded, total: course.lessons })}</span>}
      {course.recorded > 0 && <span className="tabular-nums">{t("minutes", { minutes: wholeMinutes(course.durationMs) })}</span>}
      {course.previews > 0 && <span className="text-ring">{t("previews", { count: course.previews })}</span>}
    </span>
  )
}
