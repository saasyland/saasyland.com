import type { JSX } from "react"

import { Link, type SearchSchemaInput, createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { PlusCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getCategoriesPageQuery, getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"
import { getProductsPageQuery, getProductsQuery } from "~/src/modules/product/use-cases/get-products"

import { ADMIN_PRODUCT_TABS } from "~/src/data/admin"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card } from "~/src/presentation/components/shadcn/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { AdminProductsPending } from "~/src/presentation/components/custom/admin/offerings-pending"
import { categoryColumns } from "~/src/presentation/components/custom/admin/products/category-columns"
import { productColumns } from "~/src/presentation/components/custom/admin/products/product-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const FILTERS = {
  all: {},
  drafts: { status: "draft" },
  onetime: { type: "one_time" },
  subscriptions: { type: "subscription" },
} as const

type ProductTab = (typeof ADMIN_PRODUCT_TABS)[number]

const ProductsPage = (): JSX.Element => {
  const { tab } = Route.useSearch()
  const t = useTranslations("pages.admin.products")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs selectedKey={tab} className="w-full">
        <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line" className="no-scrollbar flex-1 justify-start gap-6 overflow-x-auto">
            {ADMIN_PRODUCT_TABS.map((id) => (
              <TabsTrigger className="flex-none px-0 text-sm" href={`${ROUTES.ADMIN_PRODUCTS}?tab=${id}`} id={id} key={id}>
                {t(`tabs.${id}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <Link to={ROUTES.ADMIN_PRODUCTS_CREATE} className="shrink-0 pb-3 sm:pb-0">
            <Button size="sm" className="h-9 w-full gap-2 sm:w-auto">
              <PlusCircle className="size-4" />
              {t("actions.create")}
            </Button>
          </Link>
        </div>

        <TabsContent id={tab} className="mt-6 space-y-4 outline-none">
          {tab !== "categories" && tab !== "collections" && tab !== "courses" && (
            <DataTable
              columns={productColumns}
              key={tab}
              options={{ query: ({ pageIndex, pageSize }) => getProductsPageQuery({ pageIndex, pageSize, ...FILTERS[tab] }) }}
            />
          )}
          {(tab === "categories" || tab === "collections") && (
            <DataTable
              columns={categoryColumns}
              key={tab}
              options={{
                query: ({ pageIndex, pageSize }) =>
                  getCategoriesPageQuery({ kind: tab === "collections" ? "collection" : "category", pageIndex, pageSize }),
              }}
            />
          )}
          {tab === "courses" && (
            <Card className="flex h-32 items-center justify-center text-sm text-muted-foreground">{t("courses.empty.title")}</Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

const NAMESPACE = "pages.admin.products"

export const Route = createFileRoute("/admin/products/")({
  component: ProductsPage,
  head: pageHead(ROUTES.ADMIN_PRODUCTS),
  validateSearch: (search: SearchSchemaInput & { tab?: unknown }): { tab: ProductTab } => ({
    tab: ADMIN_PRODUCT_TABS.find((tab) => tab === search.tab) ?? "all",
  }),
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
  search: { middlewares: [stripSearchParams({ tab: "all" })] },
  pendingComponent: AdminProductsPending,
  staticData: { namespaces: [NAMESPACE] },
})
