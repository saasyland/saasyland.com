import type { JSX } from "react"

import { POLAR_PRODUCT_COLUMN_SIZES } from "~/src/data/admin-products"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"
import { DataGridPending } from "~/src/presentation/components/custom/data-grid-pending"

const POLAR_PRODUCT_PENDING_COLUMNS = [
  {
    cell: (
      <div className="flex flex-col">
        <Skeleton className="h-lh w-32 scale-y-70 text-sm" />
        <Skeleton className="h-lh w-48 scale-y-70 text-spec" />
      </div>
    ),
    id: "product",
    width: POLAR_PRODUCT_COLUMN_SIZES.product,
  },
  { cell: <Skeleton className="h-lh w-20 scale-y-70 text-sm" />, id: "prices", width: POLAR_PRODUCT_COLUMN_SIZES.prices },
  { cell: <Skeleton className="h-lh w-24 scale-y-70 text-sm" />, id: "licenseKeys", width: POLAR_PRODUCT_COLUMN_SIZES.licenseKeys },
  { cell: <Skeleton className="h-5.5 w-16 rounded-md" />, id: "status", width: POLAR_PRODUCT_COLUMN_SIZES.status },
  { cell: <Skeleton className="h-lh w-6 scale-y-70 text-sm" />, id: "sales", width: POLAR_PRODUCT_COLUMN_SIZES.sales },
  { cell: <Skeleton className="h-lh w-20 scale-y-70 text-sm" />, id: "revenue", width: POLAR_PRODUCT_COLUMN_SIZES.revenue },
  { cell: <Skeleton className="h-lh w-40 scale-y-70 font-mono text-spec" />, id: "polar", width: POLAR_PRODUCT_COLUMN_SIZES.polar },
] as const

export const AdminProductsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <AdminPageHeaderPending />
    <DataGridPending columns={POLAR_PRODUCT_PENDING_COLUMNS} isSelectable />
  </div>
)
