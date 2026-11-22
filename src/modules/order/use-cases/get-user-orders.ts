import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { countsAsRevenue, moneyOf, netAmount, revenueByCurrency } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const getUserOrders = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .validator((input: Order["getUserOrders"]) => orderZodSchemas.getUserOrders.parse(input))
  .handler(async ({ data: { userId } }) => {
    const owned = eq(order.userId, userId)
    const [rows, revenue] = await db.batch([
      db
        .select({
          currency: order.currency,
          description: order.description,
          id: order.id,
          placedAt: order.placedAt,
          refundedAmount: order.refundedAmount,
          status: order.status,
          totalAmount: order.totalAmount,
        })
        .from(order)
        .where(owned)
        .orderBy(desc(order.placedAt), desc(order.id)),
      db.select({ currency: order.currency, net: netAmount }).from(order).where(and(owned, countsAsRevenue)).groupBy(order.currency),
    ])

    return {
      orders: rows.map(({ currency, description, id, placedAt, refundedAmount, status, totalAmount }) => ({
        description,
        id,
        placedAt,
        refunded: moneyOf(refundedAmount, currency),
        status,
        total: moneyOf(totalAmount, currency),
      })),
      revenue: revenueByCurrency(revenue),
    }
  })

export const userOrdersQuery = (input: Order["getUserOrders"]) =>
  queryOptions({
    queryFn: () => getUserOrders({ data: input }),
    queryKey: [...ORDER_QUERY_KEYS.USER, input],
  })
