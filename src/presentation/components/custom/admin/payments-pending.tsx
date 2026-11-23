import type { JSX } from "react"

import { CUSTOMER_COLUMNS } from "~/src/data/customer-columns"
import {
  CUSTOMER_COLUMN_SIZES,
  ORDER_COLUMN_SIZES,
  ORDER_MIRROR_DETAILS,
  ORDER_POLAR_AMOUNTS,
  ORDER_POLAR_DETAILS,
} from "~/src/data/payments"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"
import { DataGridPending } from "~/src/presentation/components/custom/data-grid-pending"

const USER_ORDER_ROWS = ["first", "second"] as const

const NamePending = (): JSX.Element => (
  <div className="flex flex-col">
    <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
    <Skeleton className="h-lh w-40 scale-y-70 text-spec" />
  </div>
)

const TextPending = (): JSX.Element => <Skeleton className="h-lh w-24 scale-y-70 text-sm" />

const BadgePending = (): JSX.Element => <Skeleton className="h-5.5 w-16 rounded-md" />

const ORDER_PENDING_COLUMNS = [
  { cell: <NamePending />, id: "placedAt", width: ORDER_COLUMN_SIZES.placedAt },
  { cell: <NamePending />, id: "customer", width: ORDER_COLUMN_SIZES.customer },
  { cell: <TextPending />, id: "product", width: ORDER_COLUMN_SIZES.product },
  { cell: <Skeleton className="h-lh w-16 scale-y-70 text-sm" />, id: "totalAmount", width: ORDER_COLUMN_SIZES.totalAmount },
  { cell: <NamePending />, id: "discount", width: ORDER_COLUMN_SIZES.discount },
  { cell: <TextPending />, id: "country", width: ORDER_COLUMN_SIZES.country },
  { cell: <BadgePending />, id: "status", width: ORDER_COLUMN_SIZES.status },
] as const

export const AdminOrdersPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <AdminPageHeaderPending />
    <DataGridPending columns={ORDER_PENDING_COLUMNS} isSelectable />
  </div>
)

const DetailRowsPending = ({ rows }: { readonly rows: readonly string[] }): JSX.Element => (
  <div className="divide-y divide-border text-sm">
    {rows.map((row) => (
      <div className="flex items-center justify-between gap-4 py-2.5" key={row}>
        <Skeleton className="h-lh w-28 scale-y-70" />
        <Skeleton className="h-lh w-20 scale-y-70" />
      </div>
    ))}
  </div>
)

const CardHeaderPending = (): JSX.Element => (
  <CardHeader className="border-b">
    <Skeleton className="h-lh w-32 scale-y-70 text-base leading-snug" />
    <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-sm" />
  </CardHeader>
)

export const AdminOrderPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col gap-6 pb-6">
    <AdminPageHeaderPending actions={1} hasBack>
      <Skeleton className="h-lh w-56 max-w-full scale-y-70 font-mono text-spec" />
    </AdminPageHeaderPending>
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeaderPending />
          <CardContent>
            <DetailRowsPending rows={ORDER_MIRROR_DETAILS} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-lh w-24 scale-y-70 text-base leading-snug" />
          </CardHeader>
          <CardContent>
            <NamePending />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeaderPending />
        <CardContent className="flex flex-col gap-4">
          <DetailRowsPending rows={ORDER_POLAR_AMOUNTS} />
          <DetailRowsPending rows={ORDER_POLAR_DETAILS} />
          <Skeleton className="h-7 w-32 rounded-md" />
        </CardContent>
      </Card>
    </div>
  </div>
)

const CUSTOMER_PENDING_COLUMNS = [
  { cell: <NamePending />, id: "customer", width: CUSTOMER_COLUMN_SIZES.customer },
  { cell: <TextPending />, id: "signedUpAt", width: CUSTOMER_COLUMN_SIZES.signedUpAt },
  { cell: <Skeleton className="h-lh w-6 scale-y-70 text-sm" />, id: "orders", width: CUSTOMER_COLUMN_SIZES.orders },
  { cell: <Skeleton className="h-lh w-20 scale-y-70 text-sm" />, id: "revenue", width: CUSTOMER_COLUMN_SIZES.revenue },
  { cell: <TextPending />, id: "lastOrderAt", width: CUSTOMER_COLUMN_SIZES.lastOrderAt },
  ...CUSTOMER_COLUMNS.map(({ key }) => ({ cell: <TextPending />, id: key, width: CUSTOMER_COLUMN_SIZES.area })),
]

export const AdminCustomersPending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-0 w-full flex-1 flex-col gap-4">
    <Skeleton className="h-lh w-96 max-w-full scale-y-70 text-sm" />
    <DataGridPending columns={CUSTOMER_PENDING_COLUMNS} isSelectable />
  </div>
)

export const UserOrdersPending = (): JSX.Element => (
  <Card>
    <CardHeader className="border-b">
      <Skeleton className="h-lh w-20 scale-y-70 text-base leading-snug" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4 text-sm">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-lh w-32 scale-y-70" />
        <Skeleton className="h-lh w-20 scale-y-70" />
      </div>
      <div className="divide-y divide-border border-t border-border">
        {USER_ORDER_ROWS.map((row) => (
          <div className="flex items-center justify-between gap-4 py-2.5" key={row}>
            <div className="flex flex-col">
              <Skeleton className="h-lh w-32 scale-y-70" />
              <Skeleton className="h-lh w-28 scale-y-70 text-spec" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-lh w-16 scale-y-70" />
              <BadgePending />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)
