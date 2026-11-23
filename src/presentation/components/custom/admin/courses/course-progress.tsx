import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"

import {
  COURSE_PROGRESS_GRID_ID,
  useCourseProgressColumns,
} from "~/src/presentation/components/custom/admin/courses/course-progress-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

export const CourseProgress = (): JSX.Element => {
  const t = useTranslations("dashboard.courses.progress")
  const columns = useCourseProgressColumns()

  const { rows } = useSuspenseQuery(courseProgressQuery).data

  return (
    <section className="flex flex-col gap-4">
      <div className="max-w-2xl">
        <h2 className="text-title text-foreground">{t("title")}</h2>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{t("description")}</p>
      </div>

      <DataGrid columns={columns} data={rows} empty={t("empty")} id={COURSE_PROGRESS_GRID_ID} label={t("title")} />
    </section>
  )
}
