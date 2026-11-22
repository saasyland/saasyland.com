import type { JSX } from "react"

import { REVENUE_SUMMARY } from "~/src/data/payments"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { RangePickerPending, TimeSeriesChartPending } from "~/src/presentation/components/custom/admin/dashboard/time-series-chart-pending"

export const RevenueChartPending = (): JSX.Element => (
  <Card className="flex flex-col gap-5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <Skeleton className="h-lh w-28 scale-y-70 text-title" />
        <div className="mt-1 flex flex-col text-body-sm">
          <Skeleton className="h-lh w-120 max-w-full scale-y-70" />
          <Skeleton className="h-lh w-80 max-w-full scale-y-70" />
        </div>
      </div>
      <RangePickerPending />
    </div>
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-28 rounded-md" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {REVENUE_SUMMARY.map((figure) => (
          <div key={figure}>
            <Skeleton className="h-lh w-24 scale-y-70 text-label" />
            <Skeleton className="mt-1 h-lh w-28 scale-y-70 text-headline-support" />
          </div>
        ))}
      </div>
      <TimeSeriesChartPending />
    </div>
  </Card>
)
