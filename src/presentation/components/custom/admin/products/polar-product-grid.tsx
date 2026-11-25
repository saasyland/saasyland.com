import { type JSX, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { POLAR_READ } from "~/src/modules/order/order.constants"
import { productSalesQuery } from "~/src/modules/order/use-cases/get-product-sales"

import { polarProductsQuery } from "~/src/lib/polar-catalogue"

import {
  POLAR_PRODUCT_GRID_ID,
  type PolarProductRow,
  usePolarProductColumns,
} from "~/src/presentation/components/custom/admin/products/polar-product-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

export const PolarCatalogueUnavailable = (): JSX.Element => {
  const t = useTranslations("pages.admin.products.unavailable")

  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm" role="status">
      <p className="font-medium text-foreground">{t("title")}</p>
      <p className="mt-1 text-muted-foreground">{t("description")}</p>
    </div>
  )
}

export const PolarProductGrid = (): JSX.Element => {
  const t = useTranslations("pages.admin.products")
  const columns = usePolarProductColumns()

  const catalogue = useSuspenseQuery(polarProductsQuery).data
  const { products: sales } = useSuspenseQuery(productSalesQuery).data

  const rows = useMemo((): PolarProductRow[] => {
    const salesOf = new Map(sales.map((entry) => [entry.productId, entry]))

    return catalogue.products.map((product) => ({
      ...product,
      revenue: salesOf.get(product.id)?.revenue ?? [],
      sales: salesOf.get(product.id)?.sales ?? 0,
    }))
  }, [catalogue, sales])

  if (catalogue.read === POLAR_READ.UNAVAILABLE) {
    return <PolarCatalogueUnavailable />
  }

  return (
    <DataGrid
      columns={columns}
      data={rows}
      empty={t("table.empty")}
      emptyDescription={t("table.emptyDescription")}
      id={POLAR_PRODUCT_GRID_ID}
      label={t("title")}
      search={t("table.search")}
      selectable
    />
  )
}
