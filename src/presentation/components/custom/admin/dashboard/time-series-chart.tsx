import { type JSX, Suspense } from "react"

import { lazyRouteComponent } from "@tanstack/react-router"
import { useFormatter, useTranslations } from "use-intl/react"

import { TIME_BUCKET, TIME_RANGES, type TimeBucket, type TimeRange } from "~/src/modules/_core/utils/time-series"

import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

import type { TimeSeriesBarsProps } from "~/src/presentation/components/custom/admin/dashboard/time-series-bars"
import { TimeSeriesChartPending } from "~/src/presentation/components/custom/admin/dashboard/time-series-chart-pending"

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

export const TimeSeriesBars = lazyRouteComponent(
  () => import("~/src/presentation/components/custom/admin/dashboard/time-series-bars"),
  "TimeSeriesBars",
)

export const TimeSeriesChart = (props: TimeSeriesBarsProps): JSX.Element => {
  const { bucket, formatValue, label, points } = props
  const format = useFormatter()

  return (
    <figure className="flex flex-col gap-3">
      <Suspense fallback={<TimeSeriesChartPending />}>
        <TimeSeriesBars {...props} />
      </Suspense>
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
