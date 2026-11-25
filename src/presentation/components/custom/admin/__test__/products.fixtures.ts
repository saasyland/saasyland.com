import type { QueryClient } from "@tanstack/react-query"

import { POLAR_PRICE_TYPE, POLAR_PRODUCT_STATUS } from "~/src/integrations/polar/polar.constants"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { POLAR_READ } from "~/src/modules/order/order.constants"
import { productSalesQuery } from "~/src/modules/order/use-cases/get-product-sales"

import { type PolarCatalogueProduct, polarProductsQuery } from "~/src/lib/polar-catalogue"

export const adminPolarProduct = (overrides: Partial<PolarCatalogueProduct> = {}): PolarCatalogueProduct => ({
  description: "The starter with every module",
  id: "prod_core",
  licenseKeys: [{ activations: 3, id: "benefit_core" }],
  name: "Core",
  polarUrl: "https://sandbox.polar.sh/dashboard/saasyland/products/prod_core",
  prices: [{ amountType: POLAR_PRICE_TYPE.FIXED, id: "price_core", money: { amount: 249, currency: DEFAULT_CURRENCY_CODE } }],
  recurrence: undefined,
  status: POLAR_PRODUCT_STATUS.PUBLIC,
  ...overrides,
})

export const seedProductsQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(polarProductsQuery.queryKey, { products: [adminPolarProduct()], read: POLAR_READ.AVAILABLE })
  queryClient.setQueryData(productSalesQuery.queryKey, { products: [] })
}
