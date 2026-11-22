import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import type { Order } from "~/src/modules/order/order.types"

import { cn } from "~/src/lib/cn"

import { MoneyAmount } from "~/src/presentation/components/custom/admin/payments/money-amount"
import { OrderStatusBadge } from "~/src/presentation/components/custom/admin/payments/order-status-badge"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type OrderRow = Order["listRow"]

type OrderColumn = "country" | "customer" | "discount" | "placedAt" | "product" | "status" | "totalAmount"

const LINK_CLASSES =
  "rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const ColumnHeader = ({ id }: { readonly id: OrderColumn }): string => {
  const t = useTranslations("pages.admin.orders.table.headers")

  return t(id)
}

const PlacedCell = ({ row }: CellContext<DataTableFeatures, OrderRow, Date>): JSX.Element => {
  const t = useTranslations("common")

  return (
    <Link className={cn(LINK_CLASSES, "flex min-w-0 flex-col")} params={{ orderId: row.original.id }} to="/admin/orders/$orderId">
      <span>{t("dateTime", { value: row.original.placedAt })}</span>
      <span className="truncate font-mono text-spec font-normal text-muted-foreground">{row.original.id}</span>
    </Link>
  )
}

export const OrderCustomer = ({ customerId, user }: Pick<OrderRow, "customerId" | "user">): JSX.Element => {
  const t = useTranslations("pages.admin.orders.customer")

  if (user === null) {
    return (
      <div className="flex max-w-64 min-w-0 flex-col">
        <span className="text-sm text-muted-foreground">{t("noAccount")}</span>
        <span className="truncate font-mono text-spec text-muted-foreground">{customerId}</span>
      </div>
    )
  }

  return (
    <div className="flex max-w-64 min-w-0 flex-col">
      <Link className={LINK_CLASSES} params={{ userId: user.id }} to="/admin/users/$userId">
        {user.name}
      </Link>
      <span className="truncate text-spec text-muted-foreground">{user.email}</span>
    </div>
  )
}

const CustomerCell = ({ row }: CellContext<DataTableFeatures, OrderRow, string>): JSX.Element => (
  <OrderCustomer customerId={row.original.customerId} user={row.original.user} />
)

const ProductCell = ({ getValue }: CellContext<DataTableFeatures, OrderRow, string>): JSX.Element => (
  <span className="text-sm text-foreground">{getValue()}</span>
)

const TotalCell = ({ row }: CellContext<DataTableFeatures, OrderRow, OrderRow["total"]>): JSX.Element => {
  const t = useTranslations("pages.admin.orders.table")
  const format = useFormatter()
  const { refunded, total } = row.original

  return (
    <div className="flex flex-col text-sm font-medium">
      <MoneyAmount money={total} />
      {refunded.amount > 0 && (
        <span className="text-spec font-normal text-muted-foreground">
          {t("refunded", { amount: format.number(refunded.amount, { currency: refunded.currency, style: "currency" }) })}
        </span>
      )}
    </div>
  )
}

type DiscountLabelled = Pick<Order["filterOptions"]["discounts"][number], "code" | "id" | "name">

export const useDiscountLabel = (): ((discount: DiscountLabelled) => string) => {
  const t = useTranslations("pages.admin.orders.discount")

  return ({ code, id, name }) => {
    const title = name ?? id

    if (code === null) {
      return title
    }

    return t("withCode", { code, name: title })
  }
}

const DiscountCell = ({ getValue }: CellContext<DataTableFeatures, OrderRow, OrderRow["discount"]>): JSX.Element => {
  const t = useTranslations("pages.admin.orders.table")
  const label = useDiscountLabel()
  const discount = getValue()

  if (discount === undefined) {
    return <span className="text-sm text-muted-foreground">{t("noDiscount")}</span>
  }

  return (
    <div className="flex max-w-48 min-w-0 flex-col text-sm">
      <span className="wrap-anywhere text-foreground">{label(discount)}</span>
      <span className="text-spec text-muted-foreground">
        <MoneyAmount money={discount.amount} />
      </span>
    </div>
  )
}

const CountryCell = ({ getValue }: CellContext<DataTableFeatures, OrderRow, OrderRow["billingCountry"]>): JSX.Element => {
  const t = useTranslations()
  const country = getValue()

  if (country === undefined) {
    return <span className="text-sm text-muted-foreground">{t("pages.admin.orders.table.noCountry")}</span>
  }

  return <span className="text-sm text-foreground">{t(`countries.${country}`)}</span>
}

const StatusCell = ({ getValue }: CellContext<DataTableFeatures, OrderRow, OrderRow["status"]>): JSX.Element => (
  <OrderStatusBadge status={getValue()} />
)

const columnHelper = createColumnHelper<DataTableFeatures, OrderRow>()

export const orderColumns = columnHelper.columns([
  columnHelper.accessor("placedAt", { cell: PlacedCell, header: () => <ColumnHeader id="placedAt" /> }),
  columnHelper.accessor("customerId", {
    cell: CustomerCell,
    enableSorting: false,
    header: () => <ColumnHeader id="customer" />,
    id: "customer",
  }),
  columnHelper.accessor("description", {
    cell: ProductCell,
    enableSorting: false,
    header: () => <ColumnHeader id="product" />,
    id: "product",
  }),
  columnHelper.accessor("total", { cell: TotalCell, header: () => <ColumnHeader id="totalAmount" />, id: "totalAmount" }),
  columnHelper.accessor("discount", { cell: DiscountCell, enableSorting: false, header: () => <ColumnHeader id="discount" /> }),
  columnHelper.accessor("billingCountry", {
    cell: CountryCell,
    enableSorting: false,
    header: () => <ColumnHeader id="country" />,
    id: "country",
  }),
  columnHelper.accessor("status", { cell: StatusCell, header: () => <ColumnHeader id="status" /> }),
])
