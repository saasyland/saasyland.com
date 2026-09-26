import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, count, desc, eq } from "drizzle-orm"
import zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { paginationSchema } from "~/src/modules/_core/utils/pagination"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { PRODUCT_STATUSES, PRODUCT_TYPES, product } from "~/src/modules/product/product.schema"

export const listProductsSchema = paginationSchema.extend({
  status: zod.enum(PRODUCT_STATUSES).optional(),
  type: zod.enum(PRODUCT_TYPES).optional(),
})

export const getProducts = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: zod.input<typeof listProductsSchema>) => listProductsSchema.parse(input))
  .handler(async ({ data }) => {
    const filter = and(
      data.type === undefined ? undefined : eq(product.type, data.type),
      data.status === undefined ? undefined : eq(product.status, data.status),
    )
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

export const getProductsPageQuery = (input: zod.input<typeof listProductsSchema> = {}) =>
  queryOptions<Awaited<ReturnType<typeof getProducts>>>({
    queryFn: () => getProducts({ data: input }),
    queryKey: [...PRODUCT_QUERY_KEYS.LIST, listProductsSchema.parse(input)],
  })

export const getProductsQuery = getProductsPageQuery()
