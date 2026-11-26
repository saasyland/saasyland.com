import { type JSX, Suspense } from "react"

import { noop } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { productSalesQuery } from "~/src/modules/order/use-cases/get-product-sales"

import { polarProductsQuery } from "~/src/lib/polar-catalogue"
import { pageHead } from "~/src/lib/seo"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminProductsPending, PolarProductGridPending } from "~/src/presentation/components/custom/admin/products-pending"
import { PolarProductGrid } from "~/src/presentation/components/custom/admin/products/polar-product-grid"

import { ROUTES } from "~/src/routes"

const ProductsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.products")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <AdminPageHeader description={t("description")} title={t("title")} />

      <Suspense fallback={<PolarProductGridPending />}>
        <PolarProductGrid />
      </Suspense>
    </div>
  )
}

const NAMESPACE = "pages.admin.products"

export const Route = createFileRoute("/admin/products/")({
  component: ProductsPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    void context.queryClient.query({ ...polarProductsQuery, staleTime: "static" }).catch(noop)
    void context.queryClient.query({ ...productSalesQuery, staleTime: "static" }).catch(noop)
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.ADMIN.PRODUCTS),
  pendingComponent: AdminProductsPending,
  staticData: { namespaces: [NAMESPACE] },
})
