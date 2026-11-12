import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, count, desc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import type { Product } from "~/src/modules/product/product.types"
import { productZodSchemas } from "~/src/modules/product/product.zod"

export const getProducts = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: Product["getProducts"]) => productZodSchemas.getProducts.parse(input))
  .handler(async ({ data }) => {
    const filter = and(data.type && eq(product.type, data.type), data.status && eq(product.status, data.status))
    const [rows, totals] = await db.batch([
      db
        .select()
        .from(product)
        .where(filter)
        .orderBy(desc(product.createdAt), desc(product.id))
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(product).where(filter),
    ])
    return { rows, total: totals.reduce((sum, row) => sum + row.total, 0) }
  })

export const getProductsPageQuery = (input: Product["getProducts"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getProducts>>>({
    queryFn: () => getProducts({ data: input }),
    queryKey: [...PRODUCT_QUERY_KEYS.LIST, productZodSchemas.getProducts.parse(input)],
  })

export const getProductsQuery = getProductsPageQuery()
