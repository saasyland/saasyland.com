import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { type SQL, and, asc, count, desc } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { anyContains, equalTo, oneOf, withinAmounts, withinDates } from "~/src/integrations/drizzle-orm/drizzle.search"

import { currencyCodeField } from "~/src/modules/_core/utils/zod-fields"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import type { Product } from "~/src/modules/product/product.types"
import { productZodSchemas } from "~/src/modules/product/product.zod"

const sortColumns = {
  createdAt: product.createdAt,
  pricing: product.priceCents,
  product: product.name,
  status: product.status,
  type: product.type,
  updatedAt: product.updatedAt,
}

const NAMED = [product.name, product.description]

const matching = ({ filters, search, status, type }: Product["productList"]): SQL | undefined =>
  and(
    ...equalTo(product.type, type),
    ...equalTo(product.status, status),
    ...anyContains(NAMED, search),
    ...anyContains(NAMED, filters.product),
    ...oneOf(product.type, filters.type),
    ...oneOf(product.status, filters.status),
    ...withinAmounts(product.priceCents, product.currency, filters.pricing),
    ...withinDates(product.createdAt, filters.createdAt),
    ...withinDates(product.updatedAt, filters.updatedAt),
  )

export const getProducts = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: Product["getProducts"]) => productZodSchemas.getProducts.parse(input))
  .handler(async ({ data }) => {
    const filter = matching(data)
    const [rows, totals] = await db.batch([
      db
        .select()
        .from(product)
        .where(filter)
        .orderBy(...data.sorting.map((sort) => (sort.desc ? desc : asc)(sortColumns[sort.id])), desc(product.createdAt), desc(product.id))
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(product).where(filter),
    ])
    return {
      rows: rows.map((row) => Object.assign(row, { currency: currencyCodeField.parse(row.currency) })),
      total: totals.reduce((sum, row) => sum + row.total, 0),
    }
  })

export const getProductsPageQuery = (input: Product["getProducts"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getProducts>>>({
    queryFn: () => getProducts({ data: input }),
    queryKey: [...PRODUCT_QUERY_KEYS.LIST, productZodSchemas.getProducts.parse(input)],
  })

export const getProductsQuery = getProductsPageQuery()
