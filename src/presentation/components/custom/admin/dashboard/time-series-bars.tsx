import type { JSX } from "react"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useFormatter } from "use-intl/react"

import { TIME_BUCKET, type TimeBucket, type TimePoint } from "~/src/modules/_core/utils/time-series"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/src/presentation/components/shadcn/chart"

const SERIES_KEY = "value"

const CHART_MARGIN = { bottom: 0, left: 0, right: 0, top: 4 } as const

const BAR_RADIUS = 3

const AXIS_WIDTH = 64

const TICK_GAP = 24

const BUCKET_TICKS = {
  [TIME_BUCKET.DAY]: { day: "numeric" },
  [TIME_BUCKET.MONTH]: { year: "numeric" },
} as const satisfies Record<TimeBucket, Intl.DateTimeFormatOptions>

export interface TimeSeriesBarsProps {
  readonly bucket: TimeBucket
  readonly formatTick: (value: number) => string
  readonly formatValue: (value: number) => string
  readonly label: string
  readonly points: readonly TimePoint[]
}

export const TimeSeriesBars = ({ bucket, formatTick, formatValue, label, points }: TimeSeriesBarsProps): JSX.Element => {
  const format = useFormatter()
  const config = { [SERIES_KEY]: { label } }
  const data = points.map(({ start, value }) => ({
    [SERIES_KEY]: value,
    tick: format.dateTime(start, "calendarMonth", BUCKET_TICKS[bucket]),
  }))

  return (
    <ChartContainer aria-hidden className="aspect-auto h-56 w-full" config={config}>
      <BarChart accessibilityLayer={false} data={data} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} />
        <XAxis axisLine={false} dataKey="tick" minTickGap={TICK_GAP} tickLine={false} />
        <YAxis axisLine={false} tickFormatter={formatTick} tickLine={false} width={AXIS_WIDTH} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatValue(Number(value))} hideIndicator />} cursor={false} />
        <Bar dataKey={SERIES_KEY} fill="var(--chart-1)" isAnimationActive={false} radius={BAR_RADIUS} />
      </BarChart>
    </ChartContainer>
  )
}
