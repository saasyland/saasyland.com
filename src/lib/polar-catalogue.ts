import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { polar } from "~/src/integrations/polar/polar.config"
import {
  POLAR_BENEFIT_TYPE,
  POLAR_PAGE_SIZE,
  POLAR_PRICE_TYPE,
  POLAR_PRODUCT_SORTING,
  POLAR_PRODUCT_STATUS,
  POLAR_RECURRING_INTERVAL,
  polarDashboardUrl,
} from "~/src/integrations/polar/polar.constants"

import { currencyCodeField } from "~/src/modules/_core/utils/zod-fields"
import { POLAR_READ } from "~/src/modules/order/order.constants"
import { moneyOf } from "~/src/modules/order/order.utils"

const POLAR_PRODUCTS_PATH = "products"

const descriptionSchema = zod.string().trim().nonempty()

const recurrenceSchema = zod.object({ count: zod.int().positive(), interval: zod.enum(POLAR_RECURRING_INTERVAL) })

const cataloguePrice = (price: models.LegacyRecurringProductPrice | models.ProductPrice) => {
  if (price.amount_type === POLAR_PRICE_TYPE.FIXED) {
    return { amountType: price.amount_type, id: price.id, money: moneyOf(price.price_amount, price.price_currency) }
  }

  if (price.amount_type === POLAR_PRICE_TYPE.CUSTOM) {
    return { amountType: price.amount_type, id: price.id, money: moneyOf(price.minimum_amount, price.price_currency) }
  }

  return { amountType: price.amount_type, currency: currencyCodeField.parse(price.price_currency), id: price.id }
}

const catalogueProduct = (product: models.Product) => ({
  description: descriptionSchema.safeParse(product.description).data,
  id: product.id,
  licenseKeys: product.benefits.flatMap((benefit) =>
    benefit.type === POLAR_BENEFIT_TYPE.LICENSE_KEYS ? [{ activations: benefit.properties.activations?.limit, id: benefit.id }] : [],
  ),
  name: product.name,
  polarUrl: polarDashboardUrl(env.POLAR_SERVER, POLAR_PRODUCTS_PATH, product.id),
  prices: product.prices.filter(({ is_archived: isArchived }) => !isArchived).map((price) => cataloguePrice(price)),
  recurrence: recurrenceSchema.safeParse({ count: product.recurring_interval_count, interval: product.recurring_interval }).data,
  status: product.is_archived ? POLAR_PRODUCT_STATUS.ARCHIVED : product.visibility,
})

const readCatalogue = async () => {
  try {
    const products = await Array.fromAsync(
      polar.products.iterList({
        limit: POLAR_PAGE_SIZE,
        organization_id: env.POLAR_ORGANIZATION_ID,
        sorting: [POLAR_PRODUCT_SORTING.NAME],
      }),
    )

    return { products: products.map((product) => catalogueProduct(product)), read: POLAR_READ.AVAILABLE }
  } catch (error) {
    console.error("[polar] the product catalogue could not be read", error)

    return { products: [], read: POLAR_READ.UNAVAILABLE }
  }
}

export const getPolarProducts = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .handler(() => readCatalogue())

export const polarProductsQuery = queryOptions({
  queryFn: () => getPolarProducts(),
  queryKey: ["polar", "getPolarProducts"],
})

export type PolarCatalogue = Awaited<ReturnType<typeof getPolarProducts>>

export type PolarCatalogueProduct = PolarCatalogue["products"][number]

export type PolarCataloguePrice = PolarCatalogueProduct["prices"][number]
