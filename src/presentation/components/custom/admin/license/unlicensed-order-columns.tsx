import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"
import { Link } from "react-aria-components"
import { useFormatter, useTranslations } from "use-intl/react"

import type { License } from "~/src/modules/license/license.types"

import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type UnlicensedOrder = License["unlicensedOrder"]

const ColumnHeader = ({ id }: { readonly id: "amount" | "customer" | "date" | "order" }): string => {
  const t = useTranslations("dashboard.license.unlicensedOrders.columns")

  return t(id)
}

const OrderCell = ({ row }: CellContext<DataTableFeatures, UnlicensedOrder, string>): JSX.Element => {
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

const DateCell = ({ getValue }: CellContext<DataTableFeatures, UnlicensedOrder, Date>): JSX.Element => {
  const t = useTranslations("common")

  return <span className="text-spec text-muted-foreground">{t("dateTime", { value: getValue() })}</span>
}

const CustomerCell = ({ getValue }: CellContext<DataTableFeatures, UnlicensedOrder, string>): JSX.Element => (
  <span className="font-mono text-spec text-muted-foreground">{getValue()}</span>
)

const AmountCell = ({ row }: CellContext<DataTableFeatures, UnlicensedOrder, number>): JSX.Element => {
  const format = useFormatter()

  return (
    <span className="text-sm font-medium tabular-nums">
      {format.number(row.original.amount, { currency: row.original.currency, style: "currency" })}
    </span>
  )
}

const columnHelper = createColumnHelper<DataTableFeatures, UnlicensedOrder>()

export const unlicensedOrderColumns = columnHelper.columns([
  columnHelper.accessor("id", { cell: OrderCell, enableSorting: false, header: () => <ColumnHeader id="order" />, id: "order" }),
  columnHelper.accessor("placedAt", { cell: DateCell, header: () => <ColumnHeader id="date" />, id: "date", sortFn: "datetime" }),
  columnHelper.accessor("customerId", {
    cell: CustomerCell,
    enableSorting: false,
    header: () => <ColumnHeader id="customer" />,
    id: "customer",
  }),
  columnHelper.accessor("amount", { cell: AmountCell, enableSorting: false, header: () => <ColumnHeader id="amount" /> }),
])
