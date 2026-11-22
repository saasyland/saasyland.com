import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { type SQL, type SQLWrapper, inArray, sql } from "drizzle-orm"

import { type CurrencyCode, fromMinorUnits } from "~/src/modules/_core/constants/currency"
import { currencyCodeField } from "~/src/modules/_core/utils/zod-fields"
import { REVENUE_ORDER_STATUSES } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { user } from "~/src/modules/user/user.schema"

import { POLAR_DASHBOARD_HOSTS, POLAR_ORGANIZATION_SLUG } from "~/src/data/polar"

export const polarOrderUrl = (orderId: string): string =>
  new URL(
    `/dashboard/${POLAR_ORGANIZATION_SLUG}/sales/${encodeURIComponent(orderId)}`,
    `https://${POLAR_DASHBOARD_HOSTS[env.POLAR_SERVER]}`,
  ).toString()

export const netAmount: SQL<number> = sql<number>`coalesce(sum(${order.totalAmount} - ${order.refundedAmount}), 0)`.mapWith(Number)

export const countsAsRevenue: SQL = inArray(order.status, REVENUE_ORDER_STATUSES)

export const containsText = (column: SQLWrapper, text: string): SQL => sql`instr(lower(${column}), ${text.toLowerCase()}) > 0`

export const accountId = sql<string>`${user.id}`.as("account_id")

export interface Money {
  readonly amount: number
  readonly currency: CurrencyCode
}

export const moneyOf = (minorUnits: number, code: string): Money => {
  const currency = currencyCodeField.parse(code)

  return { amount: fromMinorUnits(minorUnits, currency), currency }
}

export const revenueByCurrency = (rows: readonly { readonly currency: string; readonly net: number }[]): Money[] =>
  rows.map(({ currency, net }) => moneyOf(net, currency)).toSorted((first, second) => first.currency.localeCompare(second.currency))
