import type { JSX } from "react"

import { ADMIN_PRODUCT_TABS, PRODUCT_COLUMN_SIZES } from "~/src/data/admin-products"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"
import { DataGridPending } from "~/src/presentation/components/custom/data-grid-pending"

const PRODUCT_PENDING_COLUMNS = [
  {
    cell: (
      <div className="flex flex-col">
        <Skeleton className="h-lh w-32 scale-y-70 text-sm" />
        <Skeleton className="h-lh w-48 scale-y-70 text-spec" />
      </div>
    ),
    id: "product",
    width: PRODUCT_COLUMN_SIZES.product,
  },
  { cell: <Skeleton className="h-5.5 w-22 rounded-md" />, id: "type", width: PRODUCT_COLUMN_SIZES.type },
  { cell: <Skeleton className="h-lh w-24 scale-y-70 text-sm" />, id: "pricing", width: PRODUCT_COLUMN_SIZES.pricing },
  { cell: <Skeleton className="h-5.5 w-18 rounded-md" />, id: "status", width: PRODUCT_COLUMN_SIZES.status },
  { cell: <Skeleton className="h-lh w-20 scale-y-70 text-sm" />, id: "updatedAt", width: PRODUCT_COLUMN_SIZES.updatedAt },
] as const

export const AdminProductsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col">
    <AdminPageHeaderPending tabs={ADMIN_PRODUCT_TABS.length} />
    <div className="mt-8">
      <DataGridPending columns={PRODUCT_PENDING_COLUMNS} />
    </div>
  </div>
)
