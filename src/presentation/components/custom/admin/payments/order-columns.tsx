import { type JSX, useCallback, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { ORDER_DISCOUNT_FILTERS, ORDER_STATUSES } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"
import { orderFiltersQuery } from "~/src/modules/order/use-cases/get-order-filters"

import { CURRENCIES } from "~/src/data/currencies"
import { ORDER_COLUMN_SIZES } from "~/src/data/payments"

import { cn } from "~/src/lib/cn"

import { MoneyAmount } from "~/src/presentation/components/custom/admin/payments/money-amount"
import { OrderStatusBadge } from "~/src/presentation/components/custom/admin/payments/order-status-badge"
import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type OrderRow = Order["listRow"]

export const ORDER_GRID_ID = "orders"

const LINK_CLASSES =
  "rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const PlacedCell = ({ row }: CellContext<DataGridFeatures, OrderRow, Date>): JSX.Element => {
  const t = useTranslations("common")

  return (
    <Link className={cn(LINK_CLASSES, "flex min-w-0 flex-col")} params={{ orderId: row.original.id }} to="/admin/orders/$orderId">
      <span className="truncate">{t("dateTime", { value: row.original.placedAt })}</span>
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
      <Link className={cn(LINK_CLASSES, "truncate")} params={{ userId: user.id }} to="/admin/users/$userId">
        {user.name}
      </Link>
      <span className="truncate text-spec text-muted-foreground">{user.email}</span>
    </div>
  )
}

const CustomerCell = ({ row }: CellContext<DataGridFeatures, OrderRow, string>): JSX.Element => (
  <OrderCustomer customerId={row.original.customerId} user={row.original.user} />
)

const ProductCell = ({ getValue }: CellContext<DataGridFeatures, OrderRow, string>): JSX.Element => (
  <span className="text-sm text-foreground">{getValue()}</span>
)

const TotalCell = ({ row }: CellContext<DataGridFeatures, OrderRow, OrderRow["total"]>): JSX.Element => {
  const t = useTranslations("pages.admin.orders.table")
  const format = useFormatter()
  const { refunded, total } = row.original

  return (
    <div className="flex flex-col items-end text-sm font-medium tabular-nums">
      <MoneyAmount money={total} />
      {refunded.amount > 0 && (
        <span className="truncate text-spec font-normal text-muted-foreground">
          {t("refunded", { amount: format.number(refunded.amount, { currency: refunded.currency, style: "currency" }) })}
        </span>
      )}
    </div>
  )
}

const RefundedCell = ({ getValue }: CellContext<DataGridFeatures, OrderRow, OrderRow["refunded"]>): JSX.Element => {
  const t = useTranslations("pages.admin.orders.table")
  const refunded = getValue()

  if (refunded.amount === 0) {
    return <span className="text-sm text-muted-foreground">{t("noRefund")}</span>
  }

  return (
    <span className="text-sm text-foreground">
      <MoneyAmount money={refunded} />
    </span>
  )
}

type DiscountLabelled = Pick<Order["filterOptions"]["discounts"][number], "code" | "id" | "name">

export const useDiscountLabel = (): ((discount: DiscountLabelled) => string) => {
  const t = useTranslations("pages.admin.orders.discount")

  return useCallback(
    ({ code, id, name }: DiscountLabelled) => {
      const title = name ?? id

      if (code === null) {
        return title
      }

      return t("withCode", { code, name: title })
    },
    [t],
  )
}

const DiscountCell = ({ getValue }: CellContext<DataGridFeatures, OrderRow, OrderRow["discount"]>): JSX.Element => {
  const t = useTranslations("pages.admin.orders.table")
  const label = useDiscountLabel()
  const discount = getValue()

  if (discount === undefined) {
    return <span className="text-sm text-muted-foreground">{t("noDiscount")}</span>
  }

  return (
    <div className="flex max-w-48 min-w-0 flex-col text-sm">
      <span className="truncate text-foreground">{label(discount)}</span>
      <span className="text-spec text-muted-foreground">
        <MoneyAmount money={discount.amount} />
      </span>
    </div>
  )
}

const CountryCell = ({ getValue }: CellContext<DataGridFeatures, OrderRow, OrderRow["billingCountry"]>): JSX.Element => {
  const t = useTranslations()
  const country = getValue()

  if (country === undefined) {
    return <span className="text-sm text-muted-foreground">{t("pages.admin.orders.table.noCountry")}</span>
  }

  return <span className="text-sm text-foreground">{t(`countries.${country}`)}</span>
}

const StatusCell = ({ getValue }: CellContext<DataGridFeatures, OrderRow, OrderRow["status"]>): JSX.Element => (
  <OrderStatusBadge status={getValue()} />
)

const columnHelper = createColumnHelper<DataGridFeatures, OrderRow>()

const exportedMoney = ({ amount, currency }: Order["money"]): string => `${amount.toFixed(CURRENCIES[currency].exponent)} ${currency}`

export const useOrderColumns = (): DataGridColumn<OrderRow>[] => {
  const t = useTranslations()
  const discountLabel = useDiscountLabel()

  const { countries, discounts, products } = useSuspenseQuery(orderFiltersQuery).data

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("placedAt", {
          cell: PlacedCell,
          header: t("pages.admin.orders.table.headers.placedAt"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE }, pinned: DATA_GRID_PIN.START },
          size: ORDER_COLUMN_SIZES.placedAt,
        }),
        columnHelper.accessor("customerId", {
          cell: CustomerCell,
          enableSorting: false,
          header: t("pages.admin.orders.table.headers.customer"),
          id: "customer",
          meta: {
            export: ({ customerId, user }) => (user === null ? customerId : `${user.name} <${user.email}>`),
            filter: { kind: DATA_GRID_FILTER.TEXT },
          },
          size: ORDER_COLUMN_SIZES.customer,
        }),
        columnHelper.accessor("description", {
          cell: ProductCell,
          enableSorting: false,
          header: t("pages.admin.orders.table.headers.product"),
          id: "product",
          meta: { filter: { kind: DATA_GRID_FILTER.MULTI_SELECT, options: products.map(({ id, name }) => ({ label: name, value: id })) } },
          size: ORDER_COLUMN_SIZES.product,
        }),
        columnHelper.accessor("total", {
          cell: TotalCell,
          header: t("pages.admin.orders.table.headers.totalAmount"),
          id: "totalAmount",
          meta: {
            align: DATA_GRID_ALIGN.END,
            export: ({ total }) => exportedMoney(total),
            filter: { kind: DATA_GRID_FILTER.NUMBER_RANGE },
          },
          size: ORDER_COLUMN_SIZES.totalAmount,
        }),
        columnHelper.accessor("refunded", {
          cell: RefundedCell,
          header: t("pages.admin.orders.table.headers.refundedAmount"),
          id: "refundedAmount",
          meta: { align: DATA_GRID_ALIGN.END, export: ({ refunded }) => exportedMoney(refunded), hidden: true },
          size: ORDER_COLUMN_SIZES.refundedAmount,
        }),
        columnHelper.accessor("discount", {
          cell: DiscountCell,
          enableSorting: false,
          header: t("pages.admin.orders.table.headers.discount"),
          meta: {
            export: ({ discount }) => (discount === undefined ? "" : discountLabel(discount)),
            filter: {
              kind: DATA_GRID_FILTER.SELECT,
              options: [
                ...ORDER_DISCOUNT_FILTERS.map((value) => ({ label: t(`pages.admin.orders.filters.discounts.${value}`), value })),
                ...discounts.map((discount) => ({ label: discountLabel(discount), value: discount.id })),
              ],
            },
          },
          size: ORDER_COLUMN_SIZES.discount,
        }),
        columnHelper.accessor("billingCountry", {
          cell: CountryCell,
          enableSorting: false,
          header: t("pages.admin.orders.table.headers.country"),
          id: "country",
          meta: {
            export: ({ billingCountry }) => billingCountry ?? "",
            filter: { kind: DATA_GRID_FILTER.MULTI_SELECT, options: countries.map((value) => ({ label: t(`countries.${value}`), value })) },
          },
          size: ORDER_COLUMN_SIZES.country,
        }),
        columnHelper.accessor("status", {
          cell: StatusCell,
          header: t("pages.admin.orders.table.headers.status"),
          meta: {
            export: ({ status }) => t(`pages.admin.orders.status.${status}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: ORDER_STATUSES.map((value) => ({ label: t(`pages.admin.orders.status.${value}`), value })),
            },
          },
          size: ORDER_COLUMN_SIZES.status,
        }),
      ]),
    [countries, discountLabel, discounts, products, t],
  )
}
