import { type JSX, useState, useTransition } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "use-intl/react"

import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"

import { cn } from "~/src/lib/cn"
import { DEFAULT_TIME_RANGE, type TimeRange } from "~/src/lib/time-series"

import { Card } from "~/src/presentation/components/shadcn/card"

import { EmptyPanel } from "~/src/presentation/components/custom/admin/dashboard/empty-panel"
import { RangePicker, TimeSeriesChart } from "~/src/presentation/components/custom/admin/dashboard/time-series-chart"

export const SignupsChart = (): JSX.Element => {
  const [range, setRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)

  const t = useTranslations("dashboard.auth.signups")
  const format = useFormatter()
  const [isPending, startTransition] = useTransition()
  const { bucket, points, total } = useSuspenseQuery(userSignupsQuery({ range })).data
  const count = (value: number): string => format.number(value)

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
        {total === 0 && <EmptyPanel>{t("empty")}</EmptyPanel>}
        {total > 0 && (
          <div className="flex flex-col gap-5">
            <p className="text-headline-support text-foreground tabular-nums">{t("total", { count: total })}</p>
            <TimeSeriesChart bucket={bucket} formatTick={count} formatValue={count} label={t("series")} points={points} />
          </div>
        )}
      </div>
    </Card>
  )
}
