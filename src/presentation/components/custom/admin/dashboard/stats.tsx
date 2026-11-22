import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"

const StatLabel = ({ label, to }: { readonly label: string; readonly to: string | undefined }): JSX.Element => (
  <>
    {to === undefined && label}
    {to !== undefined && (
      <Link
        className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        to={to}
      >
        {label}
      </Link>
    )}
  </>
)

const DashboardStat = ({ stat }: { readonly stat: (typeof ADMIN_DASHBOARD_STATS)[number] }): JSX.Element => {
  const t = useTranslations("dashboard")
  const format = useFormatter()
  const value = stat.useValue()

  return (
    <div className="group/stat relative flex flex-col gap-4 bg-card p-4 transition-colors duration-200 ease-exp has-[a:hover]:bg-muted/40 sm:p-5">
      <dt className="flex items-start justify-between gap-3 text-body-sm text-muted-foreground transition-colors duration-200 ease-exp group-has-[a:hover]/stat:text-foreground">
        <StatLabel label={t(`${stat.area}.${stat.key}`)} to={stat.to} />
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground"
        >
          <stat.icon className="size-4" strokeWidth={1.75} />
        </span>
      </dt>
      <dd className="flex items-end justify-between gap-3">
        <span className="text-headline-support text-foreground tabular-nums">{format.number(value)}</span>
        {stat.to !== undefined && (
          <ArrowUpRight
            aria-hidden
            className="size-4 text-muted-foreground opacity-0 transition-opacity duration-200 ease-exp group-has-[a:hover]/stat:opacity-100"
            strokeWidth={1.75}
          />
        )}
      </dd>
    </div>
  )
}

export const DashboardStats = (): JSX.Element => (
  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10 lg:grid-cols-3">
    {ADMIN_DASHBOARD_STATS.map((stat) => (
      <DashboardStat key={stat.key} stat={stat} />
    ))}
  </dl>
)
