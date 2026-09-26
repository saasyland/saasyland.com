import type { JSX } from "react"

import {
  ADMIN_ANALYTICS_KPIS,
  ADMIN_ANALYTICS_REGION_ROWS,
  ADMIN_ANALYTICS_REVENUE_BARS,
  ADMIN_ANALYTICS_TABS,
  ADMIN_ANALYTICS_UPGRADE_ROWS,
  ADMIN_ANALYTICS_Y_AXIS_VALUES,
  ADMIN_DASHBOARD_CHART_FILTERS,
  ADMIN_DASHBOARD_CHART_MONTHS,
  ADMIN_DASHBOARD_CHART_TICKS,
  ADMIN_DASHBOARD_PREVIEW_PAGINATION,
  ADMIN_DASHBOARD_STATS,
} from "~/src/data/admin"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  CheckboxPending,
  DescriptionPending,
  IconPending,
  LongDescriptionPending,
  PaginationPending,
  SortableHeadPending,
  TitlePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"

const PREVIEW_ROWS = Array.from({ length: ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize }, (_, index) => index)

const DashboardUserRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <CheckboxPending />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-md" />
        <div>
          <Skeleton className="h-lh w-16 scale-y-70" />
          <Skeleton className="h-lh w-100 scale-y-70 text-xs" />
        </div>
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-18 rounded-4xl" />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2 text-xs">
        <Skeleton className="size-2 rounded-full" />
        <Skeleton className="h-lh w-9 scale-y-70" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-19 scale-y-70 text-xs" />
    </TableCell>
    <TableCell>
      <div className="flex items-center justify-end gap-2">
        <div className="flex size-7 items-center justify-center">
          <IconPending />
        </div>
        <div className="flex size-7 items-center justify-center">
          <IconPending />
        </div>
      </div>
    </TableCell>
  </TableRow>
)

const DashboardChartPending = (): JSX.Element => (
  <Card className="gap-0 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Skeleton className="h-lh w-36 scale-y-70 text-title" />
        <Skeleton className="mt-1 h-lh w-80 max-w-full scale-y-70 text-body-sm" />
      </div>
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
        {ADMIN_DASHBOARD_CHART_FILTERS.map((filter) => (
          <Skeleton className="h-7 w-11 rounded-md" key={filter} />
        ))}
      </div>
    </div>
    <div className="relative mt-7 h-70 w-full">
      <div className="absolute top-0 bottom-6 left-0 flex flex-col justify-between font-mono text-[0.6875rem]">
        {ADMIN_DASHBOARD_CHART_TICKS.map((tick) => (
          <Skeleton className="h-lh w-6.5 scale-y-70" key={tick} />
        ))}
      </div>
      <div className="absolute top-2 right-0 bottom-8 left-11 flex flex-col justify-between">
        {ADMIN_DASHBOARD_CHART_TICKS.map((tick) => (
          <div className="h-px w-full bg-border" key={tick} />
        ))}
      </div>
      <div className="absolute right-0 bottom-0 left-11 flex justify-between font-mono text-[0.6875rem]">
        {ADMIN_DASHBOARD_CHART_MONTHS.map((month) => (
          <Skeleton className="h-lh w-5 scale-y-70" key={month.getTime()} />
        ))}
      </div>
    </div>
  </Card>
)

export const AdminDashboardPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8 pb-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <TitlePending />
        <DescriptionPending />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-33 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-3">
      {ADMIN_DASHBOARD_STATS.map((stat) => (
        <div className="bg-card px-5 py-5" key={stat}>
          <Skeleton className="h-lh w-32 scale-y-70 font-mono text-label" />
          <Skeleton className="mt-3 h-lh w-10 scale-y-70 text-headline-support" />
        </div>
      ))}
    </div>
    <DashboardChartPending />
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-lh w-36 scale-y-70 text-title" />
          <div className="mt-0.5 flex flex-col text-body-sm">
            <Skeleton className="h-lh w-100 max-w-full scale-y-70" />
            <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
          </div>
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-8 w-full rounded-lg sm:w-48" />
      </div>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <CheckboxPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
              <TableHead>
                <Skeleton className="h-lh w-12 scale-y-70" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PREVIEW_ROWS.map((row) => (
              <DashboardUserRowPending key={row} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <PaginationPending />
      <div className="flex justify-end">
        <Skeleton className="h-7 w-26 rounded-lg" />
      </div>
    </Card>
  </div>
)

const AnalyticsChartPending = (): JSX.Element => (
  <Card className="relative overflow-hidden border-border">
    <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
      <div>
        <Skeleton className="h-lh w-36 scale-y-70 text-base" />
        <Skeleton className="mt-1 h-lh w-64 scale-y-70 text-xs" />
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Skeleton className="size-2.5 rounded-sm" />
          <Skeleton className="h-lh w-26 scale-y-70" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-2.5 rounded-sm" />
          <Skeleton className="h-lh w-14 scale-y-70" />
        </div>
      </div>
    </div>
    <div className="relative flex h-72 flex-col p-6">
      <div className="absolute inset-y-6 right-6 left-6 flex flex-col justify-between">
        {ADMIN_ANALYTICS_Y_AXIS_VALUES.map((value) => (
          <div className="flex w-full items-center justify-start border-t border-border" key={value}>
            <Skeleton className="-mt-2 h-lh w-10 scale-y-70 text-xs" />
          </div>
        ))}
      </div>
      <div className="z-10 ml-8 flex flex-1 items-end gap-1 pt-4 pb-0.5 sm:gap-2">
        {ADMIN_ANALYTICS_REVENUE_BARS.map((bar) => (
          <div className="flex h-full flex-1 flex-col justify-end" key={bar.id}>
            <Skeleton className="w-full rounded-none rounded-t-xs" style={{ height: bar.height1 }} />
            <Skeleton className="w-full rounded-none rounded-b-xs" style={{ height: bar.height2 }} />
          </div>
        ))}
      </div>
    </div>
  </Card>
)

const AnalyticsListHeaderPending = (): JSX.Element => (
  <div className="flex items-center justify-between border-b border-border p-5">
    <Skeleton className="h-lh w-36 scale-y-70 text-base" />
    <Skeleton className="h-lh w-12 scale-y-70 text-xs" />
  </div>
)

export const AdminAnalyticsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div>
      <TitlePending />
      <LongDescriptionPending />
    </div>
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex h-8 min-h-8 flex-1 items-center justify-start gap-6 overflow-x-auto p-[3px]">
          {ADMIN_ANALYTICS_TABS.map((tab) => (
            <Skeleton className="h-lh w-16 shrink-0 scale-y-70 text-sm" key={tab} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-3 sm:pb-0">
          <Skeleton className="h-9 w-38 rounded-lg" />
        </div>
      </div>
      <div className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {ADMIN_ANALYTICS_KPIS.map(({ metric }) => (
            <Card className="relative overflow-hidden border-border" key={metric}>
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between">
                  <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
                <Skeleton className="h-lh w-36 scale-y-70 text-3xl" />
                <div className="mt-2 flex items-center gap-2">
                  <Skeleton className="h-5 w-13 rounded-4xl" />
                  <Skeleton className="h-lh w-18 scale-y-70 text-xs" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <AnalyticsChartPending />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="relative overflow-hidden border-border">
            <AnalyticsListHeaderPending />
            <CardContent className="space-y-5 p-5">
              {ADMIN_ANALYTICS_REGION_ROWS.map((region) => (
                <div key={region.code}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <Skeleton className="h-lh w-32 scale-y-70" />
                    <Skeleton className="h-lh w-8 scale-y-70" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-border">
            <AnalyticsListHeaderPending />
            <div className="divide-y divide-border">
              {ADMIN_ANALYTICS_UPGRADE_ROWS.map((upgrade) => (
                <div className="flex items-center justify-between p-4" key={upgrade.id}>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div>
                      <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
                      <Skeleton className="h-lh w-40 scale-y-70 text-xs" />
                    </div>
                  </div>
                  <Skeleton className="h-lh w-14 scale-y-70 text-xs" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
)
