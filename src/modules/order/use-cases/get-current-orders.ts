import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { moneyOf } from "~/src/modules/order/order.utils"

export const getCurrentOrders = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }) => {
    const rows = await db
      .select({
        checkoutId: order.checkoutId,
        currency: order.currency,
        description: order.description,
        id: order.id,
        invoiceNumber: order.invoiceNumber,
        placedAt: order.placedAt,
        refundedAmount: order.refundedAmount,
        status: order.status,
        totalAmount: order.totalAmount,
      })
      .from(order)
      .where(eq(order.userId, context.auth.user.id))
      .orderBy(desc(order.placedAt), desc(order.id))

    return {
      orders: rows.map(({ checkoutId, currency, description, id, invoiceNumber, placedAt, refundedAmount, status, totalAmount }) => ({
        checkoutId,
        description,
        id,
        invoiceNumber,
        placedAt,
        refunded: moneyOf(refundedAmount, currency),
        status,
        total: moneyOf(totalAmount, currency),
      })),
    }
  })

export const currentOrdersQuery = queryOptions({ queryFn: () => getCurrentOrders(), queryKey: ORDER_QUERY_KEYS.CURRENT })
