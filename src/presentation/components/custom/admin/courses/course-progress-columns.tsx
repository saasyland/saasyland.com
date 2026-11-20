import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import type { LessonProgress } from "~/src/modules/lesson-progress/lesson-progress.types"

import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type CourseProgressRow = LessonProgress["courseProgress"]

type CourseProgressColumnId = "completedLessons" | "course" | "finished" | "learners" | "lessons"

const ColumnHeader = ({ id }: { readonly id: CourseProgressColumnId }): string => {
  const t = useTranslations("dashboard.courses.progress.columns")

  return t(id)
}

const CountCell = ({ getValue }: CellContext<DataTableFeatures, CourseProgressRow, number>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-foreground tabular-nums">{format.number(getValue())}</span>
}

const columnHelper = createColumnHelper<DataTableFeatures, CourseProgressRow>()

export const courseProgressColumns = columnHelper.columns([
  columnHelper.accessor((row) => localize(row.title, getCurrentLocale()), {
    cell: ({ getValue }) => <span className="text-sm font-medium text-foreground">{getValue()}</span>,
    header: () => <ColumnHeader id="course" />,
    id: "course",
  }),
  columnHelper.accessor("lessons", { cell: CountCell, header: () => <ColumnHeader id="lessons" /> }),
  columnHelper.accessor("learners", { cell: CountCell, header: () => <ColumnHeader id="learners" /> }),
  columnHelper.accessor("finished", { cell: CountCell, header: () => <ColumnHeader id="finished" /> }),
  columnHelper.accessor("completedLessons", { cell: CountCell, header: () => <ColumnHeader id="completedLessons" /> }),
])
