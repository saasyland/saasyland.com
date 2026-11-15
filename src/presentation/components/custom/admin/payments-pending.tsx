import type { JSX } from "react"

import {
  ADMIN_PAYMENTS_TABS,
  ADMIN_PAYMENT_ROWS,
  ADMIN_PRICING_MODELS,
  ADMIN_PRICING_STATS,
  ADMIN_REFUND_TRENDING_STATS,
} from "~/src/data/admin-payments"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  IconPending,
  LongDescriptionPending,
  PaginationPending,
  RowActionPending,
  SortableHeadPending,
  SwitchPending,
  TitlePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"

const StatCardPending = (): JSX.Element => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
      <IconPending />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-lh w-32 scale-y-70 text-headline-support" />
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <Skeleton className="h-lh w-28 scale-y-70" />
      </div>
    </CardContent>
  </Card>
)

const TrendingStatCardPending = (): JSX.Element => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
      <IconPending />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-lh w-32 scale-y-70 text-headline-support" />
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <Skeleton className="size-3.5" />
        <Skeleton className="h-lh w-10 scale-y-70" />
        <Skeleton className="ml-1 h-lh w-20 scale-y-70" />
      </div>
    </CardContent>
  </Card>
)

const RefundRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <div className="flex flex-col">
          <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
          <Skeleton className="h-lh w-28 scale-y-70 text-xs" />
        </div>
      </div>
    </TableCell>
    <TableCell>
      <div className="flex flex-col">
        <Skeleton className="h-lh w-14 scale-y-70 text-sm" />
        <Skeleton className="h-lh w-18 scale-y-70 text-xs" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-20 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-36 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-22 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2 text-sm">
        <Skeleton className="size-1.5 rounded-full" />
        <Skeleton className="h-lh w-17 scale-y-70" />
      </div>
    </TableCell>
    <TableCell>
      <RowActionPending />
    </TableCell>
  </TableRow>
)

export const AdminPaymentsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div>
      <TitlePending />
      <Skeleton className="mt-1 h-lh w-96 max-w-full scale-y-70 text-sm" />
    </div>
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex h-8 min-h-8 flex-1 items-center justify-start gap-6 overflow-x-auto p-[3px]">
          {ADMIN_PAYMENTS_TABS.map((tab) => (
            <Skeleton className="h-lh w-18 shrink-0 scale-y-70 text-sm" key={tab} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-3 sm:pb-0">
          <Skeleton className="h-9 w-21 rounded-lg" />
          <Skeleton className="h-9 w-38 rounded-lg" />
        </div>
      </div>
      <div className="mt-6 space-y-6 text-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {ADMIN_REFUND_TRENDING_STATS.map((stat) => (
            <TrendingStatCardPending key={stat.id} />
          ))}
          <StatCardPending />
        </div>
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-lh w-32 scale-y-70 text-base" />
            <div className="flex size-8 items-center justify-center">
              <IconPending />
            </div>
          </div>
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
                    <Skeleton className="h-lh w-20 scale-y-70" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-lh w-12 scale-y-70" />
                  </TableHead>
                  <TableHead>
                    <SortableHeadPending />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-lh w-11 scale-y-70" />
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ADMIN_PAYMENT_ROWS.map((payment) => (
                  <RefundRowPending key={payment.id} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <PaginationPending />
        </Card>
      </div>
    </div>
  </div>
)

export const AdminPricingModelsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8 pb-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <TitlePending />
        <LongDescriptionPending />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="hidden h-9 w-32 rounded-lg sm:block" />
        <Skeleton className="h-9 w-33 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {ADMIN_PRICING_STATS.map((stat) => (
        <Card key={stat.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
              <Skeleton className="h-lh w-18 scale-y-70 text-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 items-start gap-6 pt-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {ADMIN_PRICING_MODELS.map((model) => (
        <Card className="relative flex h-full flex-col gap-0 py-0" key={model.id}>
          {model.isPopular && (
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-2 font-mono text-label sm:px-6">
              <span className="size-1.25 rounded-xs bg-border" />
              <Skeleton className="h-lh w-24 scale-y-70" />
            </div>
          )}
          <CardContent className="flex h-full flex-col p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <Skeleton className="mb-3 h-5 w-26 rounded-4xl" />
                <Skeleton className="h-lh w-28 scale-y-70 text-lg" />
              </div>
              <div className="mt-1">
                <SwitchPending />
              </div>
            </div>
            <div className="mb-6">
              <div className="flex items-baseline gap-1.5">
                <Skeleton className="h-lh w-20 scale-y-70 text-price" />
                <Skeleton className="h-lh w-12 scale-y-70 font-mono text-spec" />
              </div>
              <Skeleton className="mt-2 h-lh w-52 max-w-full scale-y-70 text-body-sm" />
            </div>
            <div className="mb-6 h-px w-full bg-border" />
            <div className="flex-1">
              <Skeleton className="mb-4 h-lh w-28 scale-y-70 font-mono text-label" />
              <div className="space-y-3">
                {model.features.map((feature) => (
                  <div className="flex items-start gap-3" key={feature}>
                    <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                    <Skeleton className="h-lh w-48 scale-y-70 text-sm" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
              <div className="flex items-center gap-2 text-xs">
                <IconPending />
                <Skeleton className="h-lh w-16 scale-y-70" />
              </div>
              <div className="h-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)
