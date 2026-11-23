import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { type SQL, and, asc, count, desc, eq, inArray, max, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { anyContains, flagIs, withinDates, withinNumbers } from "~/src/integrations/drizzle-orm/drizzle.search"

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { accountId, countsAsRevenue, netAmount, revenueByCurrency } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { user } from "~/src/modules/user/user.schema"

const customers = db
  .select({
    customerId: order.customerId,
    lastOrderAt: max(order.placedAt).as("last_order_at"),
    orders: count().as("orders"),
    userId: max(order.userId).as("user_id"),
  })
  .from(order)
  .groupBy(order.customerId)
  .as("customers")

const sortColumns = {
  customer: sql`lower(coalesce(${user.name}, ${customers.customerId}))`,
  lastOrderAt: customers.lastOrderAt,
  orders: customers.orders,
  signedUpAt: user.createdAt,
}

const CUSTOMER_TEXT = [customers.customerId, user.name, user.email]

const matching = (
  search: string,
  { customer, emailVerified, lastOrderAt, orders, signedUpAt }: Order["customerFilters"],
): SQL | undefined =>
  and(
    ...anyContains(CUSTOMER_TEXT, search),
    ...anyContains(CUSTOMER_TEXT, customer),
    ...flagIs(user.emailVerified, emailVerified),
    ...withinDates(customers.lastOrderAt, lastOrderAt),
    ...withinNumbers(customers.orders, orders),
    ...withinDates(user.createdAt, signedUpAt),
  )

export const getCustomers = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .validator((input: Order["getCustomers"]) => orderZodSchemas.getCustomers.parse(input))
  .handler(async ({ data }) => {
    const where = matching(data.search, data.filters)
    const [rows, totals] = await db.batch([
      db
        .select({
          customerId: customers.customerId,
          lastOrderAt: customers.lastOrderAt,
          orders: customers.orders,
          user: { createdAt: user.createdAt, email: user.email, emailVerified: user.emailVerified, id: accountId, name: user.name },
        })
        .from(customers)
        .leftJoin(user, eq(customers.userId, user.id))
        .where(where)
        .orderBy(
          ...data.sorting.map((sort) => (sort.desc ? desc : asc)(sortColumns[sort.id])),
          desc(customers.lastOrderAt),
          asc(customers.customerId),
        )
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(customers).leftJoin(user, eq(customers.userId, user.id)).where(where),
    ])

    const customerIds = rows.map(({ customerId }) => customerId)
    const revenue = await db
      .select({ currency: order.currency, customerId: order.customerId, net: netAmount })
      .from(order)
      .where(and(countsAsRevenue, inArray(order.customerId, customerIds)))
      .groupBy(order.customerId, order.currency)
    const revenueOf = Map.groupBy(revenue, ({ customerId }) => customerId)

    return {
      rows: rows.map(({ customerId, lastOrderAt, orders, user: buyer }) => ({
        customerId,
        id: customerId,
        lastOrderAt,
        orders,
        revenue: revenueByCurrency(revenueOf.get(customerId) ?? []),
        user: buyer,
      })),
      total: totals.reduce((sum, { total }) => sum + total, 0),
    }
  })

export const getCustomersPageQuery = (input: Order["getCustomers"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getCustomers>>>({
    queryFn: () => getCustomers({ data: input }),
    queryKey: [...ORDER_QUERY_KEYS.CUSTOMERS, orderZodSchemas.getCustomers.parse(input)],
  })

export const getCustomersQuery = getCustomersPageQuery()
