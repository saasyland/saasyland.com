import type { JSX } from "react"

import type { ListPagination } from "~/src/modules/_core/utils/pagination"
import type { Product } from "~/src/modules/product/product.types"

import { TabsContent } from "~/src/presentation/components/shadcn/tabs"

import { ProductsTabToolbar } from "~/src/presentation/components/custom/admin/products/components/products-tab-toolbar"
import { ProductsTableCard } from "~/src/presentation/components/custom/admin/products/components/products-table-card"
import { ProductsTableHead } from "~/src/presentation/components/custom/admin/products/components/products-table-head"
import { ProductsTableRow } from "~/src/presentation/components/custom/admin/products/components/products-table-row"

interface ProductsAllTabProps {
  readonly pagination?: ListPagination | undefined
  readonly products: readonly Product["select"][]
}

export const ProductsAllTab = ({ products, pagination }: ProductsAllTabProps): JSX.Element => (
  <TabsContent id="all" className="mt-6 space-y-4 outline-none">
    <ProductsTabToolbar />

    <ProductsTableCard pagination={pagination} end={products.length} total={products.length}>
      <ProductsTableHead variant="all" />
      <tbody className="divide-y divide-border">
        {products.map((product) => (
          <ProductsTableRow key={product.id} product={product} />
        ))}
      </tbody>
    </ProductsTableCard>
  </TabsContent>
)
