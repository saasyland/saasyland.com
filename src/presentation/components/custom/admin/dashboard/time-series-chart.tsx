import type { JSX } from "react"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useFormatter, useTranslations } from "use-intl/react"

import { TIME_BUCKET, TIME_RANGES, type TimeBucket, type TimePoint, type TimeRange } from "~/src/lib/time-series"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/src/presentation/components/shadcn/chart"
import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

const SERIES_KEY = "value"

const CHART_MARGIN = { bottom: 0, left: 0, right: 0, top: 4 } as const

const BAR_RADIUS = 3

const AXIS_WIDTH = 64

const TICK_GAP = 24

const BUCKET_TICKS = {
  [TIME_BUCKET.DAY]: { day: "numeric" },
  [TIME_BUCKET.MONTH]: { year: "numeric" },
} as const satisfies Record<TimeBucket, Intl.DateTimeFormatOptions>

const BUCKET_LABELS = {
  [TIME_BUCKET.DAY]: { day: "numeric", year: "numeric" },
  [TIME_BUCKET.MONTH]: { month: "long", year: "numeric" },
} as const satisfies Record<TimeBucket, Intl.DateTimeFormatOptions>

interface RangePickerProps {
  readonly onChange: (range: TimeRange) => void
  readonly range: TimeRange
}

export const RangePicker = ({ onChange, range }: RangePickerProps): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard.chart.range")

  return (
    <ToggleGroup
      aria-label={t("label")}
      disallowEmptySelection
      onSelectionChange={(keys) => {
        for (const option of TIME_RANGES) {
          if (keys.has(option)) {
            onChange(option)
          }
        }
      }}
      selectedKeys={[range]}
      selectionMode="single"
      size="sm"
      spacing={0}
      variant="outline"
    >
      {TIME_RANGES.map((option) => (
        <ToggleGroupItem id={option} key={option}>
          {t(option)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

interface TimeSeriesChartProps {
  readonly bucket: TimeBucket
  readonly formatTick: (value: number) => string
  readonly formatValue: (value: number) => string
  readonly label: string
  readonly points: readonly TimePoint[]
}

export const TimeSeriesChart = ({ bucket, formatTick, formatValue, label, points }: TimeSeriesChartProps): JSX.Element => {
  const format = useFormatter()
  const config = { [SERIES_KEY]: { label } }
  const data = points.map(({ start, value }) => ({
    [SERIES_KEY]: value,
    tick: format.dateTime(start, "calendarMonth", BUCKET_TICKS[bucket]),
  }))

  return (
    <figure className="flex flex-col gap-3">
      <ChartContainer aria-hidden className="aspect-auto h-56 w-full" config={config}>
        <BarChart accessibilityLayer={false} data={data} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} />
          <XAxis axisLine={false} dataKey="tick" minTickGap={TICK_GAP} tickLine={false} />
          <YAxis axisLine={false} tickFormatter={formatTick} tickLine={false} width={AXIS_WIDTH} />
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatValue(Number(value))} hideIndicator />} cursor={false} />
          <Bar dataKey={SERIES_KEY} fill="var(--chart-1)" isAnimationActive={false} radius={BAR_RADIUS} />
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        <table>
          <caption>{label}</caption>
          <tbody>
            {points.map(({ start, value }) => (
              <tr key={start.getTime()}>
                <th scope="row">{format.dateTime(start, "calendarMonth", BUCKET_LABELS[bucket])}</th>
                <td>{formatValue(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
