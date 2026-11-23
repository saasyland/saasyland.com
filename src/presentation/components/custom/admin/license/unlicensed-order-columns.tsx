import { type JSX, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"
import { Link } from "react-aria-components"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { CURRENCIES } from "~/src/modules/_core/constants/currency"
import type { License } from "~/src/modules/license/license.types"

import { DASHBOARD_COLUMN_SIZES } from "~/src/data/admin"

import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type UnlicensedOrder = License["unlicensedOrder"]

export const UNLICENSED_ORDER_GRID_ID = "unlicensed-orders"

const OrderCell = ({ row }: CellContext<DataGridFeatures, UnlicensedOrder, string>): JSX.Element => {
  const t = useTranslations("dashboard.license.unlicensedOrders")

  return (
    <Link
      aria-label={t("openInPolar", { order: row.original.id })}
      className="inline-flex items-center gap-1.5 rounded-sm font-mono text-spec text-foreground underline-offset-4 outline-none hover:underline data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-focus-visible:outline-solid"
      href={row.original.polarUrl}
      rel="noreferrer"
      target="_blank"
    >
      {row.original.id}
      <ExternalLink aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
    </Link>
  )
}

const DateCell = ({ getValue }: CellContext<DataGridFeatures, UnlicensedOrder, Date>): JSX.Element => {
  const t = useTranslations("common")

  return <span className="text-spec text-muted-foreground">{t("dateTime", { value: getValue() })}</span>
}

const CustomerCell = ({ getValue }: CellContext<DataGridFeatures, UnlicensedOrder, string>): JSX.Element => (
  <span className="font-mono text-spec text-muted-foreground">{getValue()}</span>
)

const AmountCell = ({ row }: CellContext<DataGridFeatures, UnlicensedOrder, number>): JSX.Element => {
  const format = useFormatter()

  return (
    <span className="text-sm font-medium">
      {format.number(row.original.amount, { currency: row.original.currency, style: "currency" })}
    </span>
  )
}

const columnHelper = createColumnHelper<DataGridFeatures, UnlicensedOrder>()

export const useUnlicensedOrderColumns = (): DataGridColumn<UnlicensedOrder>[] => {
  const t = useTranslations("dashboard.license.unlicensedOrders.columns")

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("id", {
          cell: OrderCell,
          enableSorting: false,
          header: t("order"),
          id: "order",
          meta: { filter: { kind: DATA_GRID_FILTER.TEXT }, pinned: DATA_GRID_PIN.START },
          size: DASHBOARD_COLUMN_SIZES.customer,
        }),
        columnHelper.accessor("placedAt", {
          cell: DateCell,
          header: t("date"),
          id: "date",
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: DASHBOARD_COLUMN_SIZES.date,
          sortFn: "datetime",
        }),
        columnHelper.accessor("customerId", {
          cell: CustomerCell,
          enableSorting: false,
          header: t("customer"),
          id: "customer",
          meta: { filter: { kind: DATA_GRID_FILTER.TEXT } },
          size: DASHBOARD_COLUMN_SIZES.customer,
        }),
        columnHelper.accessor("amount", {
          cell: AmountCell,
          header: t("amount"),
          meta: {
            align: DATA_GRID_ALIGN.END,
            export: ({ amount, currency }) => `${amount.toFixed(CURRENCIES[currency].exponent)} ${currency}`,
            filter: { kind: DATA_GRID_FILTER.NUMBER_RANGE },
          },
          size: DASHBOARD_COLUMN_SIZES.amount,
        }),
      ]),
    [t],
  )
}
