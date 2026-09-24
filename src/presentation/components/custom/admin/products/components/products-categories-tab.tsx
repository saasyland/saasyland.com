import type { JSX } from "react"

import type { ListPagination } from "~/src/modules/_core/utils/pagination"
import type { Category } from "~/src/modules/category/category.types"

import { TabsContent } from "~/src/presentation/components/shadcn/tabs"

import { ProductsCategoryRow } from "~/src/presentation/components/custom/admin/products/components/products-category-row"
import { ProductsTabToolbar } from "~/src/presentation/components/custom/admin/products/components/products-tab-toolbar"
import { ProductsTableCard } from "~/src/presentation/components/custom/admin/products/components/products-table-card"
import { ProductsTableHead } from "~/src/presentation/components/custom/admin/products/components/products-table-head"

interface ProductsCategoriesTabProps {
  readonly pagination?: ListPagination | undefined
  readonly categories: readonly Category["select"][]
}

export const ProductsCategoriesTab = ({ categories, pagination }: ProductsCategoriesTabProps): JSX.Element => (
  <TabsContent id="categories" className="mt-6 space-y-4 outline-none">
    <ProductsTabToolbar showTypeFilter={false} />

    <ProductsTableCard pagination={pagination} end={categories.length} total={categories.length}>
      <ProductsTableHead variant="categories" />
      <tbody className="divide-y divide-border">
        {categories
          .filter((category) => category.kind === "category")
          .map((category) => (
            <ProductsCategoryRow key={category.id} category={category} />
          ))}
      </tbody>
    </ProductsTableCard>
  </TabsContent>
)
