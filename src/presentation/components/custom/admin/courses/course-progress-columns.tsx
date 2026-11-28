import { type JSX, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import type { LessonProgress } from "~/src/modules/lesson-progress/lesson-progress.types"

import { DASHBOARD_COLUMN_SIZES } from "~/src/data/admin"
import { COURSE_PROGRESS_COLUMN_SIZES } from "~/src/data/admin-courses"

import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type CourseProgressRow = LessonProgress["courseProgress"]

export const COURSE_PROGRESS_GRID_ID = "course-progress"

const COUNTED = ["lessons", "learners", "finished", "completedLessons"] as const

const CourseCell = ({ getValue }: CellContext<DataGridFeatures, CourseProgressRow, string>): JSX.Element => (
  <span className="text-sm font-medium text-foreground">{getValue()}</span>
)

const CountCell = ({ getValue }: CellContext<DataGridFeatures, CourseProgressRow, number>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-foreground">{format.number(getValue())}</span>
}

const columnHelper = createColumnHelper<DataGridFeatures, CourseProgressRow>()

export const useCourseProgressColumns = (): DataGridColumn<CourseProgressRow>[] => {
  const t = useTranslations("dashboard.courses.progress.columns")

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => localize(row.title, getCurrentLocale()), {
          cell: CourseCell,
          header: t("course"),
          id: "course",
          meta: { filter: { kind: DATA_GRID_FILTER.TEXT }, pinned: DATA_GRID_PIN.START },
          size: DASHBOARD_COLUMN_SIZES.name,
        }),
        ...COUNTED.map((count) =>
          columnHelper.accessor(count, {
            cell: CountCell,
            header: t(count),
            meta: { align: DATA_GRID_ALIGN.END, filter: { kind: DATA_GRID_FILTER.NUMBER_RANGE } },
            size: COURSE_PROGRESS_COLUMN_SIZES[count],
          }),
        ),
      ]),
    [t],
  )
}
