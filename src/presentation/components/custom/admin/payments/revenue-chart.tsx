import { type JSX, useState, useTransition } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "use-intl/react"

import { DEFAULT_TIME_RANGE, type TimeBucket, type TimeRange } from "~/src/modules/_core/utils/time-series"
import type { Order } from "~/src/modules/order/order.types"
import { revenueQuery } from "~/src/modules/order/use-cases/get-revenue"

import { cn } from "~/src/lib/cn"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { EmptyPanel } from "~/src/presentation/components/custom/admin/dashboard/empty-panel"
import {
  RangePicker,
  RangePickerPending,
  TimeSeriesChart,
  TimeSeriesChartPending,
} from "~/src/presentation/components/custom/admin/dashboard/time-series-chart"

const SUMMARY = ["net", "orders", "refunded"] as const

interface CurrencyRevenueProps {
  readonly bucket: TimeBucket
  readonly revenue: Order["currencyRevenue"]
}

const CurrencyRevenue = ({ bucket, revenue }: CurrencyRevenueProps): JSX.Element => {
  const t = useTranslations("dashboard.payments.revenue")
  const format = useFormatter()
  const money = (value: number): string => format.number(value, { currency: revenue.currency, style: "currency" })
  const figures = { net: money(revenue.net), orders: format.number(revenue.orders), refunded: money(revenue.refunded) }

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SUMMARY.map((figure) => (
          <div key={figure}>
            <dt className="text-label text-muted-foreground uppercase">{t(figure)}</dt>
            <dd className="mt-1 text-headline-support text-foreground tabular-nums">{figures[figure]}</dd>
          </div>
        ))}
      </dl>
      <TimeSeriesChart
        bucket={bucket}
        formatTick={(value) => format.number(value, { currency: revenue.currency, notation: "compact", style: "currency" })}
        formatValue={money}
        label={t("series")}
        points={revenue.points}
      />
    </div>
  )
}

export const RevenueChart = (): JSX.Element => {
  const [range, setRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)

  const t = useTranslations("dashboard.payments.revenue")
  const [isPending, startTransition] = useTransition()
  const { bucket, currencies } = useSuspenseQuery(revenueQuery({ range })).data

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-title text-foreground">{t("title")}</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">{t("description")}</p>
        </div>
        <RangePicker
          onChange={(next) => {
            startTransition(() => {
              setRange(next)
            })
          }}
          range={range}
        />
      </div>

      <div aria-busy={isPending} className={cn("transition-[filter] duration-200 ease-exp", { grayscale: isPending })}>
        {currencies.length === 0 && <EmptyPanel>{t("empty")}</EmptyPanel>}
        {currencies.length > 0 && (
          <Tabs key={range}>
            <TabsList aria-label={t("currencies")}>
              {currencies.map(({ currency }) => (
                <TabsTrigger className="px-2.5 font-mono text-spec" id={currency} key={currency}>
                  {currency}
                </TabsTrigger>
              ))}
            </TabsList>
            {currencies.map((revenue) => (
              <TabsContent className="mt-3" id={revenue.currency} key={revenue.currency}>
                <CurrencyRevenue bucket={bucket} revenue={revenue} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </Card>
  )
}

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
        {SUMMARY.map((figure) => (
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
