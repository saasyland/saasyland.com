import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"

import {
  UNLICENSED_ORDER_GRID_ID,
  useUnlicensedOrderColumns,
} from "~/src/presentation/components/custom/admin/license/unlicensed-order-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

export const UnlicensedOrders = (): JSX.Element => {
  const t = useTranslations("dashboard.license.unlicensedOrders")
  const columns = useUnlicensedOrderColumns()

  const { rows } = useSuspenseQuery(unlicensedOrdersQuery).data

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-title text-foreground">{t("title")}</h2>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{t("description")}</p>
      </div>

      <DataGrid columns={columns} data={rows} empty={t("empty")} id={UNLICENSED_ORDER_GRID_ID} label={t("title")} selectable />
    </section>
  )
}
