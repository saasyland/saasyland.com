import type { QueryClient } from "@tanstack/react-query"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { CATEGORY_ICON, CATEGORY_KIND, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import type { Category } from "~/src/modules/category/category.types"
import { getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"
import { PRODUCT_STATUS, PRODUCT_TYPE } from "~/src/modules/product/product.constants"
import type { Product } from "~/src/modules/product/product.types"
import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"

import { fixtureDate } from "~/src/presentation/components/custom/admin/__test__/fixture-date"

export const adminProduct = (overrides: Partial<Product["select"]> = {}): Product["select"] => ({
  billingCycle: null,
  createdAt: fixtureDate,
  currency: DEFAULT_CURRENCY_CODE,
  description: "A professional starter",
  id: "starter",
  name: "Starter Kit",
  priceCents: 4900,
  status: PRODUCT_STATUS.PUBLISHED,
  type: PRODUCT_TYPE.ONE_TIME,
  updatedAt: fixtureDate,
  ...overrides,
})

export const adminCategory = (overrides: Partial<Category["select"]> = {}): Category["select"] => ({
  createdAt: fixtureDate,
  description: "Starter projects",
  icon: CATEGORY_ICON.FOLDER_OPEN,
  id: "starters",
  kind: CATEGORY_KIND.CATEGORY,
  name: "Starters",
  updatedAt: fixtureDate,
  visibility: CATEGORY_VISIBILITY.PUBLIC,
  ...overrides,
})

export const seedProductsQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(getProductsQuery.queryKey, { rows: [adminProduct()], total: 1 })
  queryClient.setQueryData(getCategoriesQuery.queryKey, { rows: [adminCategory()], total: 1 })
}
