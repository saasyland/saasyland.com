import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { Product } from "~/src/modules/product/product.types"
import { productZodSchemas } from "~/src/modules/product/product.zod"
import { getProductsPageQuery } from "~/src/modules/product/use-cases/get-products"

import { PRODUCT_GRID_ID, useProductColumns } from "~/src/presentation/components/custom/admin/products/product-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

export const ProductGrid = ({
  label,
  preset,
}: {
  readonly label: string
  readonly preset: Pick<Product["getProducts"], "status" | "type">
}): JSX.Element => {
  const t = useTranslations("pages.admin.products.table")
  const columns = useProductColumns()

  return (
    <DataGrid
      columns={columns}
      empty={t("empty")}
      id={PRODUCT_GRID_ID}
      label={label}
      query={(request) => getProductsPageQuery(productZodSchemas.getProducts.parse({ ...request, ...preset }))}
      search={t("search")}
    />
  )
}
