import type { JSX } from "react"

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION, DASHBOARD_COLUMN_SIZES } from "~/src/data/admin"
import { COURSE_PROGRESS_COLUMN_SIZES } from "~/src/data/admin-courses"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { GridPanelPending } from "~/src/presentation/components/custom/admin/dashboard/grid-panel-pending"

const COUNTED = ["lessons", "learners", "finished", "completedLessons"] as const

const COLUMNS = [
  { cell: <Skeleton className="h-lh w-36 scale-y-70 text-sm" />, id: "course", width: DASHBOARD_COLUMN_SIZES.name },
  ...COUNTED.map((count) => ({
    cell: <Skeleton className="ml-auto h-lh w-6 scale-y-70 text-sm" />,
    id: count,
    width: COURSE_PROGRESS_COLUMN_SIZES[count],
  })),
]

export const CourseProgressPending = (): JSX.Element => (
  <GridPanelPending columns={COLUMNS} hasSearch={false} rows={ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize} />
)
