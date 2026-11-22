import type { JSX } from "react"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { completedLessonsQuery } from "~/src/modules/lesson-progress/use-cases/get-completed-lessons"

export const CourseProgressBadge = (): JSX.Element | undefined => {
  const t = useTranslations("components.custom.course-progress-badge")

  const { data } = useQuery(completedLessonsQuery)

  if (data === undefined || data.total === 0) {
    return undefined
  }

  return (
    <>
      <span aria-hidden className="text-label text-muted-foreground">
        {t("short", data)}
      </span>
      <span className="sr-only">{t("label", data)}</span>
    </>
  )
}
