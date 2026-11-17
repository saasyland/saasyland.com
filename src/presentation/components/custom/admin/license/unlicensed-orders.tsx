import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { CircleCheck } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION } from "~/src/data/admin"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { unlicensedOrderColumns } from "~/src/presentation/components/custom/admin/license/unlicensed-order-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

const NoUnlicensedOrders = (): JSX.Element => {
  const t = useTranslations("dashboard.license.unlicensedOrders")

  return (
    <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
      <CircleCheck aria-hidden className="size-4 shrink-0 text-ring" />
      {t("empty")}
    </p>
  )
}

export const UnlicensedOrders = (): JSX.Element => {
  const t = useTranslations("dashboard.license.unlicensedOrders")

  const { rows } = useSuspenseQuery(unlicensedOrdersQuery).data

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-title text-foreground">{t("title")}</h2>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{t("description")}</p>
      </div>

      {rows.length === 0 && <NoUnlicensedOrders />}
      {rows.length > 0 && (
        <DataTable
          columns={unlicensedOrderColumns}
          data={rows}
          options={{ initialState: { pagination: ADMIN_DASHBOARD_PREVIEW_PAGINATION } }}
        />
      )}
    </Card>
  )
}

export const UnlicensedOrdersPending = (): JSX.Element => (
  <Card className="flex flex-col gap-4 p-5">
    <div>
      <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-title" />
      <div className="mt-0.5 flex flex-col text-body-sm">
        <Skeleton className="h-lh w-120 max-w-full scale-y-70" />
        <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
      </div>
    </div>
    <div className="flex items-center gap-2 text-body-sm">
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <Skeleton className="h-lh w-64 max-w-full scale-y-70" />
    </div>
  </Card>
)
