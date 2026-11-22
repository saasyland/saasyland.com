import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { getCustomersPageQuery, getCustomersQuery } from "~/src/modules/order/use-cases/get-customers"

import { pageHead } from "~/src/lib/seo"

import { AdminCustomersPending } from "~/src/presentation/components/custom/admin/payments-pending"
import { CUSTOMER_GRID_ID, useCustomerColumns } from "~/src/presentation/components/custom/admin/payments/customer-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

import { ROUTES } from "~/src/routes"

const CustomersPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  const columns = useCustomerColumns()

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <DataGrid
        columns={columns}
        empty={t("table.empty")}
        id={CUSTOMER_GRID_ID}
        label={t("metadata.title")}
        query={(request) => getCustomersPageQuery(orderZodSchemas.getCustomers.parse(request))}
        search={t("search")}
      />
    </div>
  )
}

const NAMESPACE = "pages.admin.customers"

export const Route = createFileRoute("/admin/users/customers")({
  component: CustomersPage,
  head: pageHead(ROUTES.ADMIN_USERS_CUSTOMERS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getCustomersQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminCustomersPending,
  staticData: { namespaces: [NAMESPACE] },
})
