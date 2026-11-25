import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { count } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { countsAsRevenue, netAmount, revenueByCurrency } from "~/src/modules/order/order.utils"

export const getProductSales = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .handler(async () => {
    const rows = await db
      .select({ currency: order.currency, net: netAmount, productId: order.productId, sales: count() })
      .from(order)
      .where(countsAsRevenue)
      .groupBy(order.productId, order.currency)

    return {
      products: [...Map.groupBy(rows, ({ productId }) => productId)].flatMap(([productId, currencies]) => {
        if (productId === null) {
          return []
        }

        return [{ productId, revenue: revenueByCurrency(currencies), sales: currencies.reduce((total, { sales }) => total + sales, 0) }]
      }),
    }
  })

export const productSalesQuery = queryOptions({ queryFn: () => getProductSales(), queryKey: ORDER_QUERY_KEYS.PRODUCT_SALES })
