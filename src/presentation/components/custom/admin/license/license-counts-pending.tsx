import type { JSX } from "react"

import { LICENSE_STATUSES, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { DASHBOARD_COLUMN_SIZES } from "~/src/data/admin"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { GridPanelPending } from "~/src/presentation/components/custom/admin/dashboard/grid-panel-pending"

const COLUMNS = [
  { cell: <Skeleton className="h-lh w-18 scale-y-70 text-sm" />, id: "tier", width: DASHBOARD_COLUMN_SIZES.name },
  ...LICENSE_STATUSES.map((status) => ({
    cell: <Skeleton className="ml-auto h-lh w-6 scale-y-70 text-sm" />,
    id: status,
    width: DASHBOARD_COLUMN_SIZES.count,
  })),
]

export const LicenseCountsPending = (): JSX.Element => <GridPanelPending columns={COLUMNS} hasSearch={false} rows={LICENSE_TIERS.length} />
