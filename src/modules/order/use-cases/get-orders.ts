import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { type SQL, type SQLWrapper, and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ORDER_DISCOUNT_FILTER, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { accountId, billingCountryOf, containsText, inMinorUnits, moneyOf, orderDiscountOf } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { user } from "~/src/modules/user/user.schema"

const sortColumns = {
  placedAt: order.placedAt,
  refundedAmount: order.refundedAmount,
  status: order.status,
  totalAmount: order.totalAmount,
}

const searching = (text: string): SQL | undefined => {
  if (text.length === 0) {
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

const ofCustomer = (text: string | undefined): SQL | undefined => {
  if (text === undefined || text.length === 0) {
    return undefined
  }

  return or(containsText(order.customerId, text), containsText(user.name, text), containsText(user.email, text))
}

const placedWithin = (range: Order["orderFilters"]["placedAt"]): SQL | undefined => {
  if (range === undefined) {
    return undefined
  }

  const { from, to } = range

  return and(
    from === undefined ? undefined : gte(order.placedAt, new Date(from)),
    to === undefined ? undefined : lte(order.placedAt, new Date(to)),
  )
}

const totalWithin = (range: Order["orderFilters"]["totalAmount"]): SQL | undefined => {
  if (range === undefined) {
    return undefined
  }

  const { max, min } = range

  return and(
    min === undefined ? undefined : gte(order.totalAmount, inMinorUnits(min, order.currency)),
    max === undefined ? undefined : lte(order.totalAmount, inMinorUnits(max, order.currency)),
  )
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

const oneOf = (column: SQLWrapper, values: readonly string[] | undefined): SQL | undefined => {
  if (values === undefined || values.length === 0) {
    return undefined
  }

  return inArray(column, values)
}

const matching = (
  search: string,
  { country, customer, discount, placedAt, product, status, totalAmount }: Order["orderFilters"],
): SQL | undefined =>
  and(
    searching(search),
    ofCustomer(customer),
    discounted(discount),
    oneOf(order.billingCountry, country),
    placedWithin(placedAt),
    oneOf(order.productId, product),
    oneOf(order.status, status),
    totalWithin(totalAmount),
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
