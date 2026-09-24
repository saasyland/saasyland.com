import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

export const DashboardStatsGrid = (): JSX.Element => {
  const users = useSuspenseQuery(getUsersQuery).data
  const products = useSuspenseQuery(getProductsQuery).data
  const t = useTranslations("pages.admin.dashboard")

  const pendingVerificationCount = users.pendingVerification

  const stats = [
    { key: "activeUsers", value: users.total },
    { key: "totalProducts", value: products.total },
    { key: "pendingVerification", value: pendingVerificationCount },
  ] as const

  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-3">
      {stats.map((stat) => (
        <div className="bg-card px-5 py-5" key={stat.key}>
          <dt className="font-mono text-label text-muted-foreground uppercase">{t(`stats.${stat.key}.title`)}</dt>
          <dd className="mt-3 text-headline-support text-foreground tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}
