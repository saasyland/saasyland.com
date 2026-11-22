import type { JSX } from "react"

import { TIME_RANGES } from "~/src/modules/_core/utils/time-series"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const RangePickerPending = (): JSX.Element => (
  <div className="flex">
    {TIME_RANGES.map((option) => (
      <Skeleton className="h-7 w-18 rounded-none first:rounded-l-md last:rounded-r-md" key={option} />
    ))}
  </div>
)

export const TimeSeriesChartPending = (): JSX.Element => <Skeleton className="h-56 w-full rounded-lg" />
