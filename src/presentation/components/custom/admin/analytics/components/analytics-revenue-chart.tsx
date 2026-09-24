import type { JSX } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { Card } from "~/src/presentation/components/shadcn/card"

import {
  AnalyticsChartBar,
  type AnalyticsChartBarData,
} from "~/src/presentation/components/custom/admin/analytics/components/analytics-chart-bar"

interface RevenueBar extends AnalyticsChartBarData {
  readonly amount?: number
  readonly date?: Date
}

const ANALYTICS_CHART_BARS: RevenueBar[] = [
  { amount: 2400, date: new Date("2026-05-01T12:00:00Z"), height1: "45%", height2: "15%", id: "1" },
  { height1: "35%", height2: "20%", id: "2" },
  { height1: "60%", height2: "25%", id: "3" },
  { height1: "50%", height2: "30%", id: "4" },
  { height1: "40%", height2: "22%", id: "5" },
  { height1: "70%", height2: "18%", id: "6" },
  { height1: "85%", height2: "15%", id: "7" },
  { height1: "55%", height2: "25%", id: "8" },
  { height1: "45%", height2: "35%", id: "9" },
  { height1: "30%", height2: "20%", id: "10" },
  { height1: "65%", height2: "15%", id: "11" },
  { height1: "75%", height2: "20%", id: "12" },
  { active: true, amount: 4200, height1: "90%", height2: "10%", id: "13" },
  { height1: "80%", height2: "12%", id: "14" },
  { height1: "60%", height2: "25%", id: "15" },
  { height1: "50%", height2: "35%", id: "16" },
  { height1: "70%", height2: "20%", id: "17" },
  { height1: "40%", height2: "15%", id: "18" },
]

const AXIS_MAX = 4000
const AXIS_STEP = 1000
const ZERO_TICK = 1
const ANALYTICS_Y_AXIS_VALUES = Array.from({ length: AXIS_MAX / AXIS_STEP + ZERO_TICK }, (_unused, index) => AXIS_MAX - index * AXIS_STEP)

export const AnalyticsRevenueChart = (): JSX.Element => {
  const format = useFormatter()
  const currency = (amount: number) => format.number(amount, { currency: "USD", maximumFractionDigits: 0, style: "currency" })
  const t = useTranslations("pages.admin.analytics")
  return (
    <Card className="group relative overflow-hidden border-border transition-colors hover:border-border">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div>
          <h2 className="text-base font-medium text-foreground">{t("chart.title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("chart.description")}</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-2 text-foreground/80">
            <span className="size-2.5 rounded-sm bg-primary" />
            {t("chart.legend.new")}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2.5 rounded-sm bg-secondary" />
            {t("chart.legend.renewals")}
          </div>
        </div>
      </div>

      <div className="relative flex h-72 flex-col p-6">
        <div className="pointer-events-none absolute inset-y-6 right-6 left-6 z-0 flex flex-col justify-between">
          {ANALYTICS_Y_AXIS_VALUES.map((value) => (
            <div key={value} className="flex w-full items-center justify-start border-t border-border">
              <span className="-mt-2 bg-card pr-2 text-xs text-muted-foreground">{currency(value)}</span>
            </div>
          ))}
        </div>

        <div className="z-10 ml-8 flex flex-1 items-end gap-1 pt-4 pb-0.5 sm:gap-2">
          {ANALYTICS_CHART_BARS.map((bar) => (
            <AnalyticsChartBar
              key={bar.id}
              bar={{
                ...bar,
                ...(bar.amount === undefined
                  ? {}
                  : {
                      label: `${bar.date === undefined ? t("chart.today") : format.dateTime(bar.date, { day: "numeric", month: "long", timeZone: "UTC" })}: ${currency(bar.amount)}`,
                    }),
              }}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}
