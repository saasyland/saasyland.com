import type { JSX } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { ADMIN_ANALYTICS_REVENUE_BARS, ADMIN_ANALYTICS_Y_AXIS_VALUES, type AdminAnalyticsRevenueBar } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Card } from "~/src/presentation/components/shadcn/card"

export const AnalyticsRevenueChart = (): JSX.Element => {
  const t = useTranslations("pages.admin.analytics.chart")
  const format = useFormatter()
  const currency = (amount: number): string => format.number(amount, { currency: "USD", maximumFractionDigits: 0, style: "currency" })
  const barLabel = (bar: AdminAnalyticsRevenueBar): string | undefined => {
    if (bar.amount === undefined) {
      return undefined
    }

    const day = bar.date === undefined ? t("today") : format.dateTime(bar.date, { day: "numeric", month: "long", timeZone: "UTC" })

    return `${day}: ${currency(bar.amount)}`
  }

  return (
    <Card className="group relative overflow-hidden border-border transition-colors hover:border-border">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div>
          <h2 className="text-base font-medium text-foreground">{t("title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-2 text-foreground/80">
            <span className="size-2.5 rounded-sm bg-primary" />
            {t("legend.new")}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2.5 rounded-sm bg-secondary" />
            {t("legend.renewals")}
          </div>
        </div>
      </div>

      <div className="relative flex h-72 flex-col p-6">
        <div className="pointer-events-none absolute inset-y-6 right-6 left-6 z-0 flex flex-col justify-between">
          {ADMIN_ANALYTICS_Y_AXIS_VALUES.map((value) => (
            <div key={value} className="flex w-full items-center justify-start border-t border-border">
              <span className="-mt-2 bg-card pr-2 text-xs text-muted-foreground">{currency(value)}</span>
            </div>
          ))}
        </div>

        <div className="z-10 ml-8 flex flex-1 items-end gap-1 pt-4 pb-0.5 sm:gap-2">
          {ADMIN_ANALYTICS_REVENUE_BARS.map((bar) => {
            const isActive = bar.active === true
            const label = barLabel(bar)

            return (
              <div className="group relative flex h-full flex-1 flex-col justify-end" key={bar.id}>
                <div
                  className={cn("w-full rounded-t-xs transition-colors duration-300 ease-exp", {
                    "bg-chart-1": isActive,
                    "bg-chart-1/45 group-hover:bg-chart-1/70": !isActive,
                  })}
                  style={{ height: bar.height1 }}
                />
                <div
                  className={cn("w-full rounded-b-xs transition-colors duration-300 ease-exp", {
                    "bg-chart-2": isActive,
                    "bg-chart-2/45 group-hover:bg-chart-2/70": !isActive,
                  })}
                  style={{ height: bar.height2 }}
                />
                {label !== undefined && (
                  <div
                    className={cn(
                      "absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md border border-border px-2 py-1 font-mono text-[0.6875rem] whitespace-nowrap tabular-nums",
                      {
                        "bg-foreground font-medium text-background": isActive,
                        "hidden bg-popover text-foreground group-hover:block": !isActive,
                      },
                    )}
                  >
                    {label}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
