import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import type { ADMIN_PAYMENT_ROWS } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { RowActionsCell } from "~/src/presentation/components/custom/admin/row-actions-cell"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type Payment = (typeof ADMIN_PAYMENT_ROWS)[number]

const ColumnHeader = ({ id }: { readonly id: "amount" | "customer" | "date" | "item" | "reason" | "status" }): string => {
  const t = useTranslations("pages.admin.payments.table.columns")

  return t(id)
}

const AmountCell = ({ row }: CellContext<DataTableFeatures, Payment, number>): JSX.Element => {
  const t = useTranslations("pages.admin.payments.demo")
  const format = useFormatter()

  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium">{format.number(row.original.amount, { currency: "USD", style: "currency" })}</span>
      <span className="text-xs text-muted-foreground">{t(`${row.original.id}.type`)}</span>
    </div>
  )
}

const DemoCell = ({ column, row }: CellContext<DataTableFeatures, Payment, string>): JSX.Element => {
  const t = useTranslations("pages.admin.payments.demo")

  return <span className={cn("text-sm", { "text-muted-foreground": column.id === "reason" })}>{t(`${row.original.id}.${column.id}`)}</span>
}

const DateCell = ({ getValue }: CellContext<DataTableFeatures, Payment, string>): JSX.Element => {
  const format = useFormatter()

  return (
    <span className="text-sm text-muted-foreground">
      {format.dateTime(new Date(getValue()), { day: "numeric", month: "short", year: "numeric" })}
    </span>
  )
}

const StatusCell = ({ row }: CellContext<DataTableFeatures, Payment, string>): JSX.Element => {
  const t = useTranslations("pages.admin.payments.demo")

  return (
    <div className="flex items-center gap-2">
      <div className={cn("size-1.5 rounded-full", row.original.statusColor)} />
      <span className={cn("text-sm", row.original.statusTextColor)}>{t(`${row.original.id}.status`)}</span>
    </div>
  )
}

const columnHelper = createColumnHelper<DataTableFeatures, Payment>()

export const refundColumns = columnHelper.columns([
  columnHelper.accessor("name", {
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-medium text-foreground">
          {row.original.initials}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      </div>
    ),
    header: () => <ColumnHeader id="customer" />,
    id: "customer",
  }),
  columnHelper.accessor("amount", { cell: AmountCell, header: () => <ColumnHeader id="amount" /> }),
  columnHelper.accessor("id", { cell: DemoCell, enableSorting: false, header: () => <ColumnHeader id="item" />, id: "item" }),
  columnHelper.accessor("id", { cell: DemoCell, enableSorting: false, header: () => <ColumnHeader id="reason" />, id: "reason" }),
  columnHelper.accessor("date", { cell: DateCell, header: () => <ColumnHeader id="date" />, sortFn: "text" }),
  columnHelper.accessor("id", { cell: StatusCell, enableSorting: false, header: () => <ColumnHeader id="status" />, id: "status" }),
  columnHelper.display({ cell: RowActionsCell, header: "", id: "actions" }),
])
