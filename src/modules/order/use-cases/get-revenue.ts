import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, count, gte, inArray, sum } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { bucketOf } from "~/src/integrations/drizzle-orm/drizzle.time-series"

import { type CurrencyCode, fromMinorUnits } from "~/src/modules/_core/constants/currency"
import { type TimeSeries, pointsOf, timeSeries } from "~/src/modules/_core/utils/time-series"
import { currencyCodeField } from "~/src/modules/_core/utils/zod-fields"
import { ORDER_QUERY_KEYS, REVENUE_ORDER_STATUSES } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

interface RevenueRow {
  readonly bucket: string
  readonly currency: string
  readonly orders: number
  readonly refunded: number
  readonly total: number
}

const totalOf = (rows: readonly RevenueRow[], pick: (row: RevenueRow) => number): number =>
  rows.reduce((total, row) => total + pick(row), 0)

const netOf = ({ refunded, total }: RevenueRow): number => total - refunded

const netByBucket = (rows: readonly RevenueRow[]): Map<string, number> =>
  new Map([...Map.groupBy(rows, ({ bucket }) => bucket)].map(([bucket, bucketRows]) => [bucket, totalOf(bucketRows, netOf)]))

const revenueIn = (currency: CurrencyCode, rows: readonly RevenueRow[], series: TimeSeries) => ({
  currency,
  gross: fromMinorUnits(
    totalOf(rows, ({ total }) => total),
    currency,
  ),
  net: fromMinorUnits(totalOf(rows, netOf), currency),
  orders: totalOf(rows, ({ orders }) => orders),
  points: pointsOf(series, netByBucket(rows)).map(({ start, value }) => ({ start, value: fromMinorUnits(value, currency) })),
  refunded: fromMinorUnits(
    totalOf(rows, ({ refunded }) => refunded),
    currency,
  ),
})

export const getRevenue = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .validator((input: Order["getRevenue"]) => orderZodSchemas.getRevenue.parse(input))
  .handler(async ({ data }) => {
    const series = timeSeries(data.range, new Date())
    const bucket = bucketOf(order.placedAt, series.bucket)
    const rows = await db
      .select({
        bucket,
        currency: order.currency,
        orders: count(),
        refunded: sum(order.refundedAmount).mapWith(Number),
        total: sum(order.totalAmount).mapWith(Number),
      })
      .from(order)
      .where(and(inArray(order.status, REVENUE_ORDER_STATUSES), gte(order.placedAt, series.since)))
      .groupBy(bucket, order.currency)

    const currencies = [...Map.groupBy(rows, ({ currency }) => currencyCodeField.parse(currency))]
      .map(([currency, currencyRows]) => revenueIn(currency, currencyRows, series))
      .toSorted((first, second) => second.orders - first.orders || first.currency.localeCompare(second.currency))

    return { bucket: series.bucket, currencies }
  })

export const revenueQuery = (input: Order["getRevenue"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getRevenue>>>({
    queryFn: () => getRevenue({ data: input }),
    queryKey: [...ORDER_QUERY_KEYS.REVENUE, orderZodSchemas.getRevenue.parse(input)],
  })
