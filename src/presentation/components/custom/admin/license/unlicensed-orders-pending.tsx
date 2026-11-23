import type { JSX } from "react"

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION, DASHBOARD_COLUMN_SIZES } from "~/src/data/admin"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { GridPanelPending } from "~/src/presentation/components/custom/admin/dashboard/grid-panel-pending"

const COLUMNS = [
  { cell: <Skeleton className="h-lh w-40 scale-y-70 text-spec" />, id: "order", width: DASHBOARD_COLUMN_SIZES.customer },
  { cell: <Skeleton className="h-lh w-28 scale-y-70 text-sm" />, id: "date", width: DASHBOARD_COLUMN_SIZES.date },
  { cell: <Skeleton className="h-lh w-36 scale-y-70 text-spec" />, id: "customer", width: DASHBOARD_COLUMN_SIZES.customer },
  { cell: <Skeleton className="ml-auto h-lh w-16 scale-y-70 text-sm" />, id: "amount", width: DASHBOARD_COLUMN_SIZES.amount },
]

export const UnlicensedOrdersPending = (): JSX.Element => (
  <GridPanelPending columns={COLUMNS} hasSearch={false} rows={ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize} />
)
