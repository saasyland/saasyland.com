import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { type SQL, and, asc, count, desc, eq, gte, isNotNull, isNull, or } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type TimeRange, timeSeries } from "~/src/modules/_core/utils/time-series"
import { ORDER_DISCOUNT_FILTER, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { accountId, billingCountryOf, containsText, moneyOf, orderDiscountOf } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { user } from "~/src/modules/user/user.schema"

const sortColumns = {
  placedAt: order.placedAt,
  status: order.status,
  totalAmount: order.totalAmount,
}

const searching = (text: string | undefined): SQL | undefined => {
  if (text === undefined || text.length === 0) {
    return undefined
  }

  return or(
    containsText(order.id, text),
    containsText(order.customerId, text),
    containsText(order.description, text),
    containsText(user.name, text),
    containsText(user.email, text),
  )
}

const placedWithin = (range: TimeRange | undefined): SQL | undefined => {
  if (range === undefined) {
    return undefined
  }

  const { since } = timeSeries(range, new Date())

  return gte(order.placedAt, since)
}

const discounted = (discount: string | undefined): SQL | undefined => {
  if (discount === undefined) {
    return undefined
  }

  if (discount === ORDER_DISCOUNT_FILTER.ANY) {
    return isNotNull(order.discountId)
  }

  if (discount === ORDER_DISCOUNT_FILTER.NONE) {
    return isNull(order.discountId)
  }

  return eq(order.discountId, discount)
}

const matching = ({ country, customer, discount, placedAt, product, status }: Order["orderFilters"]): SQL | undefined =>
  and(
    searching(customer),
    discounted(discount),
    country === undefined ? undefined : eq(order.billingCountry, country),
    placedWithin(placedAt),
    product === undefined ? undefined : eq(order.productId, product),
    status === undefined ? undefined : eq(order.status, status),
  )

export const getOrders = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .validator((input: Order["getOrders"]) => orderZodSchemas.getOrders.parse(input))
  .handler(async ({ data }) => {
    const where = matching(data.filters)
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
