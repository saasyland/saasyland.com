import { type JSX, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { CURRENCIES } from "~/src/modules/_core/constants/currency"
import { FLAG_FILTERS } from "~/src/modules/_core/utils/pagination"
import type { Order } from "~/src/modules/order/order.types"

import { type CustomerColumn as AreaColumn, CUSTOMER_COLUMNS } from "~/src/data/customer-columns"
import { CUSTOMER_COLUMN_SIZES } from "~/src/data/payments"

import { MoneyAmount } from "~/src/presentation/components/custom/admin/payments/money-amount"
import { OrderCustomer } from "~/src/presentation/components/custom/admin/payments/order-columns"
import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type CustomerRow = Order["customerRow"]

export const CUSTOMER_GRID_ID = "customers"

const CustomerCell = ({ row }: CellContext<DataGridFeatures, CustomerRow, string>): JSX.Element => (
  <OrderCustomer customerId={row.original.customerId} user={row.original.user} />
)

const NoAccount = (): JSX.Element => {
  const t = useTranslations("pages.admin.customers.table")

  return <span className="text-sm text-muted-foreground">{t("noAccount")}</span>
}

const SignedUpCell = ({ row }: CellContext<DataGridFeatures, CustomerRow, Date | undefined>): JSX.Element => {
  const t = useTranslations("common")
  const { user } = row.original

  if (user === null) {
    return <NoAccount />
  }

  return <span className="text-sm text-muted-foreground">{t("dateTime", { value: user.createdAt })}</span>
}

const VerifiedCell = ({ row }: CellContext<DataGridFeatures, CustomerRow, boolean | undefined>): JSX.Element => {
  const t = useTranslations("pages.admin.customers.table")
  const { user } = row.original

  if (user === null) {
    return <NoAccount />
  }

  return <span className="text-sm text-muted-foreground">{user.emailVerified ? t("yes") : t("no")}</span>
}

const OrdersCell = ({ getValue }: CellContext<DataGridFeatures, CustomerRow, number>): JSX.Element => (
  <span className="text-sm text-foreground tabular-nums">{getValue()}</span>
)

const RevenueCell = ({ getValue }: CellContext<DataGridFeatures, CustomerRow, CustomerRow["revenue"]>): JSX.Element => {
  const t = useTranslations("pages.admin.customers.table")
  const revenue = getValue()

  if (revenue.length === 0) {
    return <span className="text-sm text-muted-foreground">{t("noRevenue")}</span>
  }

  return (
    <ul className="flex flex-col items-end text-sm font-medium text-foreground tabular-nums">
      {revenue.map((money) => (
        <li key={money.currency}>
          <MoneyAmount money={money} />
        </li>
      ))}
    </ul>
  )
}

const LastOrderCell = ({ getValue }: CellContext<DataGridFeatures, CustomerRow, Date>): JSX.Element => {
  const t = useTranslations("common")

  return <span className="text-sm text-muted-foreground">{t("dateTime", { value: getValue() })}</span>
}

const pageAccounts = (rows: readonly { readonly original: CustomerRow }[]): string[] =>
  rows.flatMap(({ original }) => (original.user === null ? [] : [original.user.id]))

const AreaCell = ({
  Cell,
  row,
  table,
}: CellContext<DataGridFeatures, CustomerRow, CustomerRow["user"]> & Pick<AreaColumn, "Cell">): JSX.Element => {
  const { user } = row.original

  if (user === null) {
    return <NoAccount />
  }

  return <Cell accounts={pageAccounts(table.getRowModel().rows)} userId={user.id} />
}

const exportedMoney = ({ amount, currency }: Order["money"]): string => `${amount.toFixed(CURRENCIES[currency].exponent)} ${currency}`

const columnHelper = createColumnHelper<DataGridFeatures, CustomerRow>()

export const useCustomerColumns = (): DataGridColumn<CustomerRow>[] => {
  const t = useTranslations()

  return useMemo(() => {
    const flagOptions = FLAG_FILTERS.map((value) => ({ label: t(`pages.admin.customers.table.${value}`), value }))

    return columnHelper.columns([
      columnHelper.accessor("customerId", {
        cell: CustomerCell,
        header: t("pages.admin.customers.table.headers.customer"),
        id: "customer",
        meta: {
          export: ({ customerId, user }) => (user === null ? customerId : `${user.name} <${user.email}>`),
          filter: { kind: DATA_GRID_FILTER.TEXT },
          pinned: DATA_GRID_PIN.START,
        },
        size: CUSTOMER_COLUMN_SIZES.customer,
      }),
      columnHelper.accessor((row) => row.user?.createdAt, {
        cell: SignedUpCell,
        header: t("pages.admin.customers.table.headers.signedUpAt"),
        id: "signedUpAt",
        meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
        size: CUSTOMER_COLUMN_SIZES.signedUpAt,
      }),
      columnHelper.accessor((row) => row.user?.emailVerified, {
        cell: VerifiedCell,
        enableSorting: false,
        header: t("pages.admin.customers.table.headers.emailVerified"),
        id: "emailVerified",
        meta: {
          export: ({ user }) => {
            if (user === null) {
              return ""
            }
            return t(user.emailVerified ? "pages.admin.customers.table.yes" : "pages.admin.customers.table.no")
          },
          filter: { kind: DATA_GRID_FILTER.SELECT, options: flagOptions },
          hidden: true,
        },
        size: CUSTOMER_COLUMN_SIZES.emailVerified,
      }),
      columnHelper.accessor("orders", {
        cell: OrdersCell,
        header: t("pages.admin.customers.table.headers.orders"),
        meta: { align: DATA_GRID_ALIGN.END, filter: { kind: DATA_GRID_FILTER.NUMBER_RANGE } },
        size: CUSTOMER_COLUMN_SIZES.orders,
      }),
      columnHelper.accessor("revenue", {
        cell: RevenueCell,
        enableSorting: false,
        header: t("pages.admin.customers.table.headers.revenue"),
        meta: { align: DATA_GRID_ALIGN.END, export: ({ revenue }) => revenue.map((money) => exportedMoney(money)).join("; ") },
        size: CUSTOMER_COLUMN_SIZES.revenue,
      }),
      columnHelper.accessor("lastOrderAt", {
        cell: LastOrderCell,
        header: t("pages.admin.customers.table.headers.lastOrderAt"),
        meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
        size: CUSTOMER_COLUMN_SIZES.lastOrderAt,
      }),
      ...CUSTOMER_COLUMNS.map(({ Cell, header, key }) =>
        columnHelper.accessor("user", {
          cell: (context) => <AreaCell {...context} Cell={Cell} />,
          enableSorting: false,
          header: t(header),
          id: key,
          size: CUSTOMER_COLUMN_SIZES.area,
        }),
      ),
    ])
  }, [t])
}
