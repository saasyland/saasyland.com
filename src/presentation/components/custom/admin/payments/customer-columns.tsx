import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import type { Order } from "~/src/modules/order/order.types"

import { type CustomerColumn as AreaColumn, CUSTOMER_COLUMNS } from "~/src/data/customer-columns"

import { MoneyAmount } from "~/src/presentation/components/custom/admin/payments/money-amount"
import { OrderCustomer } from "~/src/presentation/components/custom/admin/payments/order-columns"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type CustomerRow = Order["customerRow"]

type CustomerColumn = "customer" | "emailVerified" | "lastOrderAt" | "orders" | "revenue" | "signedUpAt"

const ColumnHeader = ({ id }: { readonly id: CustomerColumn }): string => {
  const t = useTranslations("pages.admin.customers.table.headers")

  return t(id)
}

const CustomerCell = ({ row }: CellContext<DataTableFeatures, CustomerRow, string>): JSX.Element => (
  <OrderCustomer customerId={row.original.customerId} user={row.original.user} />
)

const SignedUpCell = ({ getValue }: CellContext<DataTableFeatures, CustomerRow, CustomerRow["user"]>): JSX.Element => {
  const t = useTranslations()
  const user = getValue()

  if (user === null) {
    return <span className="text-sm text-muted-foreground">{t("pages.admin.customers.table.noAccount")}</span>
  }

  return <span className="text-sm text-muted-foreground">{t("common.dateTime", { value: user.createdAt })}</span>
}

const VerifiedCell = ({ getValue }: CellContext<DataTableFeatures, CustomerRow, CustomerRow["user"]>): JSX.Element => {
  const t = useTranslations("pages.admin.customers.table")
  const user = getValue()

  if (user === null) {
    return <span className="text-sm text-muted-foreground">{t("noAccount")}</span>
  }

  return <span className="text-sm text-muted-foreground">{user.emailVerified ? t("yes") : t("no")}</span>
}

const OrdersCell = ({ getValue }: CellContext<DataTableFeatures, CustomerRow, number>): JSX.Element => (
  <span className="text-sm text-foreground tabular-nums">{getValue()}</span>
)

const RevenueCell = ({ getValue }: CellContext<DataTableFeatures, CustomerRow, CustomerRow["revenue"]>): JSX.Element => {
  const t = useTranslations("pages.admin.customers.table")
  const revenue = getValue()

  if (revenue.length === 0) {
    return <span className="text-sm text-muted-foreground">{t("noRevenue")}</span>
  }

  return (
    <ul className="flex flex-col text-sm font-medium text-foreground">
      {revenue.map((money) => (
        <li key={money.currency}>
          <MoneyAmount money={money} />
        </li>
      ))}
    </ul>
  )
}

const LastOrderCell = ({ getValue }: CellContext<DataTableFeatures, CustomerRow, Date>): JSX.Element => {
  const t = useTranslations("common")

  return <span className="text-sm text-muted-foreground">{t("dateTime", { value: getValue() })}</span>
}

const pageAccounts = (rows: readonly { readonly original: CustomerRow }[]): string[] =>
  rows.flatMap(({ original }) => (original.user === null ? [] : [original.user.id]))

const AreaCell = ({
  Cell,
  getValue,
  table,
}: CellContext<DataTableFeatures, CustomerRow, CustomerRow["user"]> & Pick<AreaColumn, "Cell">): JSX.Element => {
  const t = useTranslations("pages.admin.customers.table")
  const user = getValue()

  if (user === null) {
    return <span className="text-sm text-muted-foreground">{t("noAccount")}</span>
  }

  return <Cell accounts={pageAccounts(table.getRowModel().rows)} userId={user.id} />
}

const columnHelper = createColumnHelper<DataTableFeatures, CustomerRow>()

export const customerColumns = columnHelper.columns([
  columnHelper.accessor("customerId", { cell: CustomerCell, header: () => <ColumnHeader id="customer" />, id: "customer" }),
  columnHelper.accessor("user", {
    cell: SignedUpCell,
    header: () => <ColumnHeader id="signedUpAt" />,
    id: "signedUpAt",
  }),
  columnHelper.accessor("user", {
    cell: VerifiedCell,
    enableSorting: false,
    header: () => <ColumnHeader id="emailVerified" />,
    id: "emailVerified",
  }),
  columnHelper.accessor("orders", { cell: OrdersCell, header: () => <ColumnHeader id="orders" /> }),
  columnHelper.accessor("revenue", { cell: RevenueCell, enableSorting: false, header: () => <ColumnHeader id="revenue" /> }),
  columnHelper.accessor("lastOrderAt", { cell: LastOrderCell, header: () => <ColumnHeader id="lastOrderAt" /> }),
  ...CUSTOMER_COLUMNS.map(({ Cell, Header, key }) =>
    columnHelper.accessor("user", {
      cell: (context) => <AreaCell {...context} Cell={Cell} />,
      enableSorting: false,
      header: () => <Header />,
      id: key,
    }),
  ),
])
