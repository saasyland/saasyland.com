import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { productSalesQuery } from "~/src/modules/order/use-cases/get-product-sales"

import { polarProductsQuery } from "~/src/lib/polar-catalogue"
import { pageHead } from "~/src/lib/seo"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminProductsPending } from "~/src/presentation/components/custom/admin/products-pending"
import { PolarProductGrid } from "~/src/presentation/components/custom/admin/products/polar-product-grid"

import { ROUTES } from "~/src/routes"

const ProductsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.products")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <AdminPageHeader description={t("description")} title={t("title")} />

      <PolarProductGrid />
    </div>
  )
}

const NAMESPACE = "pages.admin.products"

export const Route = createFileRoute("/admin/products/")({
  component: ProductsPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...polarProductsQuery, staleTime: "static" }),
      context.queryClient.query({ ...productSalesQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.ADMIN.PRODUCTS),
  pendingComponent: AdminProductsPending,
  staticData: { namespaces: [NAMESPACE] },
})
