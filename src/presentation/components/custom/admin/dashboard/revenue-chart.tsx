import type { JSX } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { ADMIN_DASHBOARD_CHART_FILTERS, ADMIN_DASHBOARD_CHART_MONTHS, ADMIN_DASHBOARD_CHART_TICKS } from "~/src/data/admin"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card } from "~/src/presentation/components/shadcn/card"

const CHART_SERIES_PATH = "M0,180 C100,150 200,200 300,120 C400,60 500,130 600,100 C700,80 800,160 900,60 L1000,40"

export const RevenueChart = (): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard.chart")
  const format = useFormatter()

  return (
    <Card className="gap-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-title text-foreground">{t("title")}</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
          {ADMIN_DASHBOARD_CHART_FILTERS.map((filter, index) => (
            <Button
              className="h-7 rounded-md px-2.5 text-xs data-[variant=ghost]:text-muted-foreground"
              key={filter}
              size="sm"
              variant={index === 0 ? "secondary" : "ghost"}
            >
              {t(`filters.${filter}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative mt-7 h-70 w-full">
        <div className="absolute top-0 bottom-6 left-0 flex flex-col justify-between font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
          {ADMIN_DASHBOARD_CHART_TICKS.map((tick) => (
            <span key={tick}>
              {format.number(tick, { currency: "USD", maximumFractionDigits: 0, notation: "compact", style: "currency" })}
            </span>
          ))}
        </div>

        <div className="absolute top-2 right-0 bottom-8 left-11 flex flex-col justify-between">
          {ADMIN_DASHBOARD_CHART_TICKS.map((tick) => (
            <div className="h-px w-full bg-border" key={tick} />
          ))}
        </div>

        <div className="absolute top-2 right-0 bottom-8 left-11">
          <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 240">
            <title>{t("title")}</title>
            <defs>
              <linearGradient id="dashboardRevenueFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${CHART_SERIES_PATH} L1000,240 L0,240 Z`} fill="url(#dashboardRevenueFill)" />
            <path
              d={CHART_SERIES_PATH}
              fill="none"
              stroke="var(--chart-1)"
              strokeLinecap="round"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx="1000"
              cy="40"
              fill="var(--chart-1)"
              r="3.5"
              stroke="var(--card)"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div className="absolute right-0 bottom-0 left-11 flex justify-between font-mono text-[0.6875rem] text-muted-foreground">
          {ADMIN_DASHBOARD_CHART_MONTHS.map((month) => (
            <span key={month.getTime()}>{format.dateTime(month, { month: "short", timeZone: "UTC" })}</span>
          ))}
        </div>
      </div>
    </Card>
  )
}
