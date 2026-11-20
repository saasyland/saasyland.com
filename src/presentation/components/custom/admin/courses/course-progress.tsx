import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION } from "~/src/data/admin"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { courseProgressColumns } from "~/src/presentation/components/custom/admin/courses/course-progress-columns"
import { EmptyPanel } from "~/src/presentation/components/custom/admin/dashboard/empty-panel"
import { DataTable } from "~/src/presentation/components/custom/data-table"

export const CourseProgress = (): JSX.Element => {
  const t = useTranslations("dashboard.courses.progress")

  const { rows } = useSuspenseQuery(courseProgressQuery).data

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="max-w-2xl">
        <h2 className="text-title text-foreground">{t("title")}</h2>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{t("description")}</p>
      </div>

      {rows.length === 0 && <EmptyPanel>{t("empty")}</EmptyPanel>}
      {rows.length > 0 && (
        <DataTable
          columns={courseProgressColumns}
          data={rows}
          options={{ initialState: { pagination: ADMIN_DASHBOARD_PREVIEW_PAGINATION } }}
        />
      )}
    </Card>
  )
}

export const CourseProgressPending = (): JSX.Element => (
  <Card className="flex flex-col gap-4 p-5">
    <div className="max-w-2xl">
      <Skeleton className="h-lh w-40 scale-y-70 text-title" />
      <div className="mt-0.5 flex flex-col text-body-sm">
        <Skeleton className="h-lh w-120 max-w-full scale-y-70" />
        <Skeleton className="h-lh w-64 max-w-full scale-y-70" />
      </div>
    </div>
    <div className="flex items-center gap-2 text-body-sm">
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <Skeleton className="h-lh w-32 max-w-full scale-y-70" />
    </div>
  </Card>
)
