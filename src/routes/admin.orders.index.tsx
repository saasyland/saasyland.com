import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { TIME_RANGES } from "~/src/modules/_core/utils/time-series"
import { ORDER_DISCOUNT_FILTERS, ORDER_STATUSES } from "~/src/modules/order/order.constants"
import { orderFiltersQuery } from "~/src/modules/order/use-cases/get-order-filters"
import { getOrdersPageQuery, getOrdersQuery } from "~/src/modules/order/use-cases/get-orders"

import { pageHead } from "~/src/lib/seo"

import { AdminOrdersPending } from "~/src/presentation/components/custom/admin/payments-pending"
import { orderColumns, useDiscountLabel } from "~/src/presentation/components/custom/admin/payments/order-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const OrdersPage = (): JSX.Element => {
  const t = useTranslations()
  const discountLabel = useDiscountLabel()

  const { countries, discounts, products } = useSuspenseQuery(orderFiltersQuery).data

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("pages.admin.orders.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("pages.admin.orders.description")}</p>
      </div>

      <div className="flex flex-col gap-4">
        <DataTable
          columns={orderColumns}
          empty={t("pages.admin.orders.empty")}
          filters={[
            { columnId: "customer", placeholder: t("pages.admin.orders.filters.search"), type: "search" },
            {
              columnId: "status",
              label: t("pages.admin.orders.filters.status"),
              options: ORDER_STATUSES.map((status) => ({ label: t(`pages.admin.orders.status.${status}`), value: status })),
              type: "select",
            },
            {
              columnId: "product",
              label: t("pages.admin.orders.filters.product"),
              options: products.map(({ id, name }) => ({ label: name, value: id })),
              type: "select",
            },
            {
              columnId: "discount",
              label: t("pages.admin.orders.filters.discount"),
              options: [
                ...ORDER_DISCOUNT_FILTERS.map((filter) => ({ label: t(`pages.admin.orders.filters.discounts.${filter}`), value: filter })),
                ...discounts.map((discount) => ({ label: discountLabel(discount), value: discount.id })),
              ],
              type: "select",
            },
            {
              columnId: "country",
              label: t("pages.admin.orders.filters.country"),
              options: countries.map((country) => ({ label: t(`countries.${country}`), value: country })),
              type: "select",
            },
            {
              columnId: "placedAt",
              label: t("pages.admin.orders.filters.placedAt"),
              options: TIME_RANGES.map((range) => ({ label: t(`pages.admin.orders.filters.ranges.${range}`), value: range })),
              type: "select",
            },
          ]}
          options={{ query: getOrdersPageQuery }}
        />
      </div>
    </div>
  )
}

const ORDERS_NAMESPACE = "pages.admin.orders"
const NAMESPACES = [ORDERS_NAMESPACE, "countries"] as const

export const Route = createFileRoute("/admin/orders/")({
  component: OrdersPage,
  head: pageHead(ROUTES.ADMIN_ORDERS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: ORDERS_NAMESPACE }),
      preloadNamespaces({ locale, namespaces: NAMESPACES, queryClient: context.queryClient }),
      context.queryClient.query({ ...getOrdersQuery, staleTime: "static" }),
      context.queryClient.query({ ...orderFiltersQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminOrdersPending,
  staticData: { namespaces: NAMESPACES },
})
