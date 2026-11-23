import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { orderFiltersQuery } from "~/src/modules/order/use-cases/get-order-filters"
import { getOrdersPageQuery, getOrdersQuery } from "~/src/modules/order/use-cases/get-orders"

import { pageHead } from "~/src/lib/seo"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminOrdersPending } from "~/src/presentation/components/custom/admin/payments-pending"
import { ORDER_GRID_ID, useOrderColumns } from "~/src/presentation/components/custom/admin/payments/order-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

import * as ROUTES from "~/src/routes"

const OrdersPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const columns = useOrderColumns()

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <AdminPageHeader description={t("description")} title={t("title")} />

      <DataGrid
        columns={columns}
        empty={t("empty")}
        emptyDescription={t("emptyDescription")}
        id={ORDER_GRID_ID}
        label={t("title")}
        query={(request) => getOrdersPageQuery(orderZodSchemas.getOrders.parse(request))}
        search={t("filters.search")}
        selectable
      />
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
