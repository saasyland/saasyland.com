import type { JSX } from "react"

import type { ListPagination } from "~/src/modules/_core/utils/pagination"
import type { Category } from "~/src/modules/category/category.types"
import type { Product } from "~/src/modules/product/product.types"

import { Tabs, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { ProductsAllTab } from "~/src/presentation/components/custom/admin/products/components/products-all-tab"
import { ProductsCategoriesTab } from "~/src/presentation/components/custom/admin/products/components/products-categories-tab"
import { ProductsCollectionsTab } from "~/src/presentation/components/custom/admin/products/components/products-collections-tab"
import { ProductsCoursesTab } from "~/src/presentation/components/custom/admin/products/components/products-courses-tab"
import { ProductsOnetimeTab } from "~/src/presentation/components/custom/admin/products/components/products-onetime-tab"
import { ProductsSubscriptionsTab } from "~/src/presentation/components/custom/admin/products/components/products-subscriptions-tab"
import { PRODUCT_TABS, type ProductTab } from "~/src/presentation/components/custom/admin/products/constants/product-tabs"

import { ROUTES } from "~/src/routes"

interface ProductsPageTabsProps {
  readonly pagination?: ListPagination | undefined
  readonly activeTab: ProductTab
  readonly products: readonly Product["select"][]
  readonly categories: readonly Category["select"][]
  readonly labels: Readonly<Record<ProductTab, string>>
}

const ActivePanel = ({ activeTab, categories, products, pagination }: Omit<ProductsPageTabsProps, "labels">): JSX.Element => {
  switch (activeTab) {
    case "all":
    case "drafts": {
      return <ProductsAllTab products={products} pagination={pagination} />
    }
    case "onetime": {
      return <ProductsOnetimeTab products={products} pagination={pagination} />
    }
    case "subscriptions": {
      return <ProductsSubscriptionsTab products={products} pagination={pagination} />
    }
    case "categories": {
      return <ProductsCategoriesTab categories={categories} pagination={pagination} />
    }
    case "collections": {
      return <ProductsCollectionsTab categories={categories} pagination={pagination} />
    }
    case "courses": {
      return <ProductsCoursesTab />
    }
  }
}

export const ProductsPageTabs = ({ activeTab, products, categories, labels, pagination }: ProductsPageTabsProps): JSX.Element => (
  <Tabs selectedKey={activeTab === "drafts" ? "all" : activeTab} className="w-full">
    <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
      <TabsList variant="line" className="no-scrollbar flex-1 justify-start gap-6 overflow-x-auto">
        {PRODUCT_TABS.map((tab) => (
          <TabsTrigger key={tab} id={tab} href={`${ROUTES.ADMIN_PRODUCTS}?tab=${tab}`} className="flex-none px-0 text-sm">
            {labels[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>

    <ActivePanel activeTab={activeTab} categories={categories} products={products} pagination={pagination} />
  </Tabs>
)
