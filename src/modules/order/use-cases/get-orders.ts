import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { type SQL, and, asc, count, desc, eq, isNotNull, isNull } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { anyContains, oneOf, withinAmounts, withinDates } from "~/src/integrations/drizzle-orm/drizzle.search"

import { ORDER_DISCOUNT_FILTER, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { accountId, billingCountryOf, moneyOf, orderDiscountOf } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { user } from "~/src/modules/user/user.schema"

const sortColumns = {
  placedAt: order.placedAt,
  refundedAmount: order.refundedAmount,
  status: order.status,
  totalAmount: order.totalAmount,
}

const SEARCHED = [order.id, order.customerId, order.description, user.name, user.email]

const CUSTOMER_TEXT = [order.customerId, user.name, user.email]

const DISCOUNT_PRESENCE: Readonly<Record<string, SQL>> = {
  [ORDER_DISCOUNT_FILTER.ANY]: isNotNull(order.discountId),
  [ORDER_DISCOUNT_FILTER.NONE]: isNull(order.discountId),
}

const discounted = (discount: string | undefined): SQL[] => {
  if (discount === undefined) {
    return []
  }

  return [DISCOUNT_PRESENCE[discount] ?? eq(order.discountId, discount)]
}

const matching = (
  search: string,
  { country, customer, discount, placedAt, product, status, totalAmount }: Order["orderFilters"],
): SQL | undefined =>
  and(
    ...anyContains(SEARCHED, search),
    ...anyContains(CUSTOMER_TEXT, customer),
    ...discounted(discount),
    ...oneOf(order.billingCountry, country),
    ...withinDates(order.placedAt, placedAt),
    ...oneOf(order.productId, product),
    ...oneOf(order.status, status),
    ...withinAmounts(order.totalAmount, order.currency, totalAmount),
  )

export const getOrders = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .validator((input: Order["getOrders"]) => orderZodSchemas.getOrders.parse(input))
  .handler(async ({ data }) => {
    const where = matching(data.search, data.filters)
    const [rows, totals] = await db.batch([
      db
        .select({
          billingCountry: order.billingCountry,
          currency: order.currency,
          customerId: order.customerId,
          description: order.description,
          discountAmount: order.discountAmount,
          discountCode: order.discountCode,
          discountId: order.discountId,
          discountName: order.discountName,
          id: order.id,
          placedAt: order.placedAt,
          refundedAmount: order.refundedAmount,
          status: order.status,
          totalAmount: order.totalAmount,
          user: { email: user.email, id: accountId, name: user.name },
        })
        .from(order)
        .leftJoin(user, eq(order.userId, user.id))
        .where(where)
        .orderBy(...data.sorting.map((sort) => (sort.desc ? desc : asc)(sortColumns[sort.id])), desc(order.placedAt), desc(order.id))
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(order).leftJoin(user, eq(order.userId, user.id)).where(where),
    ])

    return {
      rows: rows.map(
        ({
          billingCountry,
          currency,
          customerId,
          description,
          id,
          placedAt,
          refundedAmount,
          status,
          totalAmount,
          user: buyer,
          ...discount
        }) => ({
          billingCountry: billingCountryOf(billingCountry),
          customerId,
          description,
          discount: orderDiscountOf({ ...discount, currency }),
          id,
          placedAt,
          refunded: moneyOf(refundedAmount, currency),
          status,
          total: moneyOf(totalAmount, currency),
          user: buyer,
        }),
      ),
      total: totals.reduce((sum, { total }) => sum + total, 0),
    }
  })

export const getOrdersPageQuery = (input: Order["getOrders"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getOrders>>>({
    queryFn: () => getOrders({ data: input }),
    queryKey: [...ORDER_QUERY_KEYS.LIST, orderZodSchemas.getOrders.parse(input)],
  })

export const getOrdersQuery = getOrdersPageQuery()
