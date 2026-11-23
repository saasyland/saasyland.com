import type { JSX } from "react"

import { createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import * as zod from "zod"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { CATEGORY_KIND } from "~/src/modules/category/category.constants"
import { getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"
import { PRODUCT_STATUS, PRODUCT_TYPE } from "~/src/modules/product/product.constants"
import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"

import { ADMIN_PRODUCT_TABS } from "~/src/data/admin-products"

import { searchChoice } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminProductsPending } from "~/src/presentation/components/custom/admin/products-pending"
import { CategoryGrid } from "~/src/presentation/components/custom/admin/products/category-grid"
import { ProductGrid } from "~/src/presentation/components/custom/admin/products/product-grid"

import * as ROUTES from "~/src/routes"

const FILTERS = {
  all: {},
  drafts: { status: PRODUCT_STATUS.DRAFT },
  onetime: { type: PRODUCT_TYPE.ONE_TIME },
  subscriptions: { type: PRODUCT_TYPE.SUBSCRIPTION },
} as const

type ProductTab = (typeof ADMIN_PRODUCT_TABS)[number]

const DEFAULT_TAB: ProductTab = "all"

const ProductsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.products")

  const { tab } = Route.useSearch()
  const categoryKind = tab === "collections" ? CATEGORY_KIND.COLLECTION : CATEGORY_KIND.CATEGORY

  return (
    <Tabs className="w-full animate-in gap-0 duration-500 fade-in-50" selectedKey={tab}>
      <AdminPageHeader
        description={t("description")}
        tabs={
          <TabsList className="no-scrollbar justify-start gap-6 overflow-x-auto" variant="line">
            {ADMIN_PRODUCT_TABS.map((id) => (
              <TabsTrigger className="flex-none px-0 text-sm" href={`${ROUTES.ADMIN_PRODUCTS}?tab=${id}`} id={id} key={id}>
                {t(`tabs.${id}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        }
        title={t("title")}
      />

      <TabsContent className="mt-8 space-y-4 outline-none" id={tab}>
        {tab !== "categories" && tab !== "collections" && <ProductGrid key={tab} label={t(`tabs.${tab}`)} preset={FILTERS[tab]} />}
        {(tab === "categories" || tab === "collections") && <CategoryGrid key={tab} kind={categoryKind} label={t(`tabs.${tab}`)} />}
      </TabsContent>
    </Tabs>
  )
}

const NAMESPACE = "pages.admin.products"

export const Route = createFileRoute("/admin/products/")({
  validateSearch: zod.object({
    tab: searchChoice(ADMIN_PRODUCT_TABS, DEFAULT_TAB),
  }),
  component: ProductsPage,
  head: pageHead(ROUTES.ADMIN_PRODUCTS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getCategoriesQuery, staleTime: "static" }),
      context.queryClient.query({ ...getProductsQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminProductsPending,
  search: { middlewares: [stripSearchParams({ tab: DEFAULT_TAB })] },
  staticData: { namespaces: [NAMESPACE] },
})
