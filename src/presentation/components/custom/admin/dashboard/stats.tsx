import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { ADMIN_DASHBOARD_STATS } from "~/src/data/admin"

export const DashboardStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard.stats")
  const users = useSuspenseQuery(getUsersQuery).data
  const products = useSuspenseQuery(getProductsQuery).data

  const values = { activeUsers: users.total, pendingVerification: users.pendingVerification, totalProducts: products.total }

  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-3">
      {ADMIN_DASHBOARD_STATS.map((key) => (
        <div className="bg-card px-5 py-5" key={key}>
          <dt className="font-mono text-label text-muted-foreground uppercase">{t(`${key}.title`)}</dt>
          <dd className="mt-3 text-headline-support text-foreground tabular-nums">{values[key]}</dd>
        </div>
      ))}
    </dl>
  )
}
