import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { CheckCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AdminProductCreatePending } from "~/src/presentation/components/custom/admin/offerings-pending"
import { ProductDetails } from "~/src/presentation/components/custom/admin/products/details"
import { ProductSidebar } from "~/src/presentation/components/custom/admin/products/sidebar"

import { ROUTES } from "~/src/routes"

const ProductsCreatePage = (): JSX.Element => {
  const t = useTranslations("pages.admin.products.create")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="h-9 px-3">
            {t("actions.cancel")}
          </Button>
          <Button className="h-9 gap-2 px-4">
            <CheckCircle className="size-4" />
            {t("actions.save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <ProductDetails />
        <ProductSidebar />
      </div>
    </div>
  )
}

const NAMESPACE = "pages.admin.products.create"

export const Route = createFileRoute("/admin/products/create")({
  component: ProductsCreatePage,
  head: pageHead(ROUTES.ADMIN_PRODUCTS_CREATE),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminProductCreatePending,
  staticData: { namespaces: [NAMESPACE] },
})
