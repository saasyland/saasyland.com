import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"

const DashboardStat = ({ stat }: { readonly stat: (typeof ADMIN_DASHBOARD_STATS)[number] }): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard.stats")
  const value = stat.useValue()

  return (
    <div className="bg-card px-5 py-5">
      <dt className="font-mono text-label text-muted-foreground uppercase">{t(`${stat.key}.title`)}</dt>
      <dd className="mt-3 text-headline-support text-foreground tabular-nums">{value}</dd>
    </div>
  )
}

export const DashboardStats = (): JSX.Element => (
  <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-3">
    {ADMIN_DASHBOARD_STATS.map((stat) => (
      <DashboardStat key={stat.key} stat={stat} />
    ))}
  </dl>
)
