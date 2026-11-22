import type { JSX } from "react"

import { CUSTOMER_COLUMNS } from "~/src/data/customer-columns"
import { ORDER_MIRROR_DETAILS, ORDER_POLAR_AMOUNTS, ORDER_POLAR_DETAILS } from "~/src/data/payments"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  LongDescriptionPending,
  PAGE_ROWS,
  PaginationPending,
  SortableHeadPending,
  TitlePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"

const ORDER_FILTERS = ["status", "product", "discount", "country", "placedAt"] as const

const USER_ORDER_ROWS = ["first", "second"] as const

const SearchPending = (): JSX.Element => <Skeleton className="h-10 w-full flex-1 rounded-md sm:min-w-64" />

const NamePending = (): JSX.Element => (
  <div className="flex flex-col">
    <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
    <Skeleton className="h-lh w-40 scale-y-70 text-spec" />
  </div>
)

const HeadPending = (): JSX.Element => <Skeleton className="h-lh w-16 scale-y-70" />

const TextPending = (): JSX.Element => <Skeleton className="h-lh w-24 scale-y-70 text-sm" />

const BadgePending = (): JSX.Element => <Skeleton className="h-5.5 w-16 rounded-md" />

const OrderRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <NamePending />
    </TableCell>
    <TableCell>
      <NamePending />
    </TableCell>
    <TableCell>
      <TextPending />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-16 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <NamePending />
    </TableCell>
    <TableCell>
      <TextPending />
    </TableCell>
    <TableCell>
      <BadgePending />
    </TableCell>
  </TableRow>
)

export const AdminOrdersPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div>
      <TitlePending />
      <LongDescriptionPending />
    </div>
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchPending />
        {ORDER_FILTERS.map((filter) => (
          <Skeleton className="h-10 w-full rounded-md sm:w-48" key={filter} />
        ))}
      </div>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
              <TableHead>
                <HeadPending />
              </TableHead>
              <TableHead>
                <HeadPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
              <TableHead>
                <HeadPending />
              </TableHead>
              <TableHead>
                <HeadPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAGE_ROWS.map((row) => (
              <OrderRowPending key={row} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <PaginationPending />
    </div>
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
        <TitlePending />
        <Skeleton className="h-lh w-56 max-w-full scale-y-70 font-mono text-spec" />
      </div>
      <Skeleton className="h-9 w-36 rounded-md" />
    </div>
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

const CustomerRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <NamePending />
    </TableCell>
    <TableCell>
      <TextPending />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-8 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-6 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-20 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <TextPending />
    </TableCell>
    {CUSTOMER_COLUMNS.map(({ key }) => (
      <TableCell key={key}>
        <TextPending />
      </TableCell>
    ))}
  </TableRow>
)

export const AdminCustomersPending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-0 w-full flex-1 flex-col gap-4">
    <Skeleton className="h-lh w-96 max-w-full scale-y-70 text-sm" />
    <SearchPending />
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead>
              <HeadPending />
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead>
              <HeadPending />
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            {CUSTOMER_COLUMNS.map(({ key }) => (
              <TableHead key={key}>
                <HeadPending />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PAGE_ROWS.map((row) => (
            <CustomerRowPending key={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <PaginationPending />
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
