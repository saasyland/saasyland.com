import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { TIME_RANGES } from "~/src/modules/_core/utils/time-series"
import { ORDER_STATUSES } from "~/src/modules/order/order.constants"
import { orderProductsQuery } from "~/src/modules/order/use-cases/get-order-products"
import { getOrdersPageQuery, getOrdersQuery } from "~/src/modules/order/use-cases/get-orders"

import { pageHead } from "~/src/lib/seo"

import { AdminOrdersPending } from "~/src/presentation/components/custom/admin/payments-pending"
import { orderColumns } from "~/src/presentation/components/custom/admin/payments/order-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const OrdersPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.orders")

  const { products } = useSuspenseQuery(orderProductsQuery).data

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-col gap-4">
        <DataTable
          columns={orderColumns}
          filters={[
            { columnId: "customer", placeholder: t("filters.search"), type: "search" },
            {
              columnId: "status",
              label: t("filters.status"),
              options: ORDER_STATUSES.map((status) => ({ label: t(`status.${status}`), value: status })),
              type: "select",
            },
            {
              columnId: "product",
              label: t("filters.product"),
              options: products.map(({ id, name }) => ({ label: name, value: id })),
              type: "select",
            },
            {
              columnId: "placedAt",
              label: t("filters.placedAt"),
              options: TIME_RANGES.map((range) => ({ label: t(`filters.ranges.${range}`), value: range })),
              type: "select",
            },
          ]}
          options={{ query: getOrdersPageQuery }}
        />
      </div>
    </div>
  )
}

const NAMESPACE = "pages.admin.orders"

export const Route = createFileRoute("/admin/orders/")({
  component: OrdersPage,
  head: pageHead(ROUTES.ADMIN_ORDERS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getOrdersQuery, staleTime: "static" }),
      context.queryClient.query({ ...orderProductsQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminOrdersPending,
  staticData: { namespaces: [NAMESPACE] },
})
