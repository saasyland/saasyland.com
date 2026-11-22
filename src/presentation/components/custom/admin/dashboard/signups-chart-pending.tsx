import type { JSX } from "react"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { RangePickerPending, TimeSeriesChartPending } from "~/src/presentation/components/custom/admin/dashboard/time-series-chart-pending"

export const SignupsChartPending = (): JSX.Element => (
  <Card className="flex flex-col gap-5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <Skeleton className="h-lh w-28 scale-y-70 text-title" />
        <Skeleton className="mt-1 h-lh w-120 max-w-full scale-y-70 text-body-sm" />
      </div>
      <RangePickerPending />
    </div>
    <div className="flex flex-col gap-5">
      <Skeleton className="h-lh w-40 scale-y-70 text-headline-support" />
      <TimeSeriesChartPending />
    </div>
  </Card>
)
