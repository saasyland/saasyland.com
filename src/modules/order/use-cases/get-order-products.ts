import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, max } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"

export const getOrderProducts = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .handler(async () => {
    const rows = await db
      .select({ description: order.description, lastPlacedAt: max(order.placedAt), productId: order.productId })
      .from(order)
      .groupBy(order.productId)
      .orderBy(asc(order.description), asc(order.productId))

    return {
      products: rows.flatMap(({ description, productId }) => (productId === null ? [] : [{ id: productId, name: description }])),
    }
  })

export const orderProductsQuery = queryOptions({ queryFn: () => getOrderProducts(), queryKey: ORDER_QUERY_KEYS.PRODUCTS })
