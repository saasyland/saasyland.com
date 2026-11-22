import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, isNotNull, max } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { billingCountryOf } from "~/src/modules/order/order.utils"

export const getOrderFilters = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .handler(async () => {
    const [products, discounts, countries] = await db.batch([
      db
        .select({ description: order.description, lastPlacedAt: max(order.placedAt), productId: order.productId })
        .from(order)
        .groupBy(order.productId)
        .orderBy(asc(order.description), asc(order.productId)),
      db
        .select({ code: order.discountCode, discountId: order.discountId, lastPlacedAt: max(order.placedAt), name: order.discountName })
        .from(order)
        .groupBy(order.discountId)
        .orderBy(asc(order.discountName), asc(order.discountId)),
      db
        .selectDistinct({ billingCountry: order.billingCountry })
        .from(order)
        .where(isNotNull(order.billingCountry))
        .orderBy(asc(order.billingCountry)),
    ])

    return {
      countries: countries.flatMap(({ billingCountry }) => {
        const country = billingCountryOf(billingCountry)

        return country === undefined ? [] : [country]
      }),
      discounts: discounts.flatMap(({ code, discountId, name }) => (discountId === null ? [] : [{ code, id: discountId, name }])),
      products: products.flatMap(({ description, productId }) => (productId === null ? [] : [{ id: productId, name: description }])),
    }
  })

export const orderFiltersQuery = queryOptions({ queryFn: () => getOrderFilters(), queryKey: ORDER_QUERY_KEYS.FILTERS })
