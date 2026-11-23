import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import { order } from "~/src/modules/order/order.schema"
import { revenueQuery } from "~/src/modules/order/use-cases/get-revenue"

import { TIME_BUCKET, TIME_RANGE } from "~/src/lib/time-series"

const NOW = new Date("2026-11-20T15:00:00.000Z")
const ADMIN_ID = "01900000-0000-7000-8000-000000000031"

const paid = ([id, placedAt, currency, totalAmount]: readonly [string, string, string, number]) =>
  orderRow({ currency, id, placedAt: new Date(placedAt), totalAmount })

const ORDERS = [
  paid(["ord_today", "2026-11-20T09:00:00.000Z", "usd", 19_900]),
  {
    ...paid(["ord_partly_refunded", "2026-11-18T10:00:00.000Z", "USD", 9900]),
    refundedAmount: 4900,
    status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
  },
  { ...paid(["ord_refunded", "2026-11-18T11:00:00.000Z", "usd", 9900]), refundedAmount: 9900, status: POLAR_ORDER_STATUS.REFUNDED },
  paid(["ord_euro", "2026-11-01T08:00:00.000Z", "eur", 71_920]),
  paid(["ord_first_day", "2026-10-22T00:00:00.000Z", "eur", 1000]),
  paid(["ord_day_before", "2026-10-21T23:59:59.999Z", "eur", 5000]),
  paid(["ord_yen", "2026-10-01T08:00:00.000Z", "jpy", 37_000]),
  paid(["ord_last_year", "2025-11-30T23:00:00.000Z", "usd", 50_000]),
  { ...paid(["ord_pending", "2026-11-19T08:00:00.000Z", "usd", 70_000]), status: POLAR_ORDER_STATUS.PENDING },
  { ...paid(["ord_draft", "2026-11-19T08:00:00.000Z", "usd", 70_000]), status: POLAR_ORDER_STATUS.DRAFT },
  { ...paid(["ord_void", "2026-11-19T08:00:00.000Z", "usd", 70_000]), status: POLAR_ORDER_STATUS.VOID },
]

const valueOn = (points: readonly { readonly start: Date; readonly value: number }[], start: string): number | undefined =>
  points.find((point) => point.start.toISOString() === start)?.value

beforeEach(async () => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  await db.delete(order)
  await db.insert(order).values(ORDERS)
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_ID }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("get-revenue", () => {
  it("totals the last 30 days per currency, subtracting each refund from the order it refunds", async () => {
    const { bucket, currencies } = await executeQuery(revenueQuery({ range: TIME_RANGE.LAST_30_DAYS }))

    expect(bucket).toBe(TIME_BUCKET.DAY)
    expect(currencies.map(({ currency, gross, net, orders, refunded }) => ({ currency, gross, net, orders, refunded }))).toStrictEqual([
      { currency: "USD", gross: 397, net: 249, orders: 3, refunded: 148 },
      { currency: "EUR", gross: 729.2, net: 729.2, orders: 2, refunded: 0 },
    ])
  })

  it("draws one point per UTC day, with the days without orders at zero", async () => {
    const { currencies } = await executeQuery(revenueQuery())
    const [usd, eur] = currencies

    expect(usd?.points).toHaveLength(30)
    expect(usd?.points.at(0)?.start).toStrictEqual(new Date("2026-10-22T00:00:00.000Z"))
    expect(usd?.points.at(-1)?.start).toStrictEqual(new Date("2026-11-20T00:00:00.000Z"))
    expect(valueOn(usd?.points ?? [], "2026-11-20T00:00:00.000Z")).toBe(199)
    expect(valueOn(usd?.points ?? [], "2026-11-18T00:00:00.000Z")).toBe(50)
    expect(valueOn(usd?.points ?? [], "2026-11-19T00:00:00.000Z")).toBe(0)
    expect(valueOn(eur?.points ?? [], "2026-10-22T00:00:00.000Z")).toBe(10)
    expect(valueOn(eur?.points ?? [], "2026-11-01T00:00:00.000Z")).toBe(719.2)
  })

  it("keeps only the last 7 days when asked", async () => {
    const { currencies } = await executeQuery(revenueQuery({ range: TIME_RANGE.LAST_7_DAYS }))

    expect(currencies.map(({ currency, net }) => [currency, net])).toStrictEqual([["USD", 249]])
    expect(currencies[0]?.points.map(({ start }) => start.toISOString().slice(0, 10))).toStrictEqual([
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
    ])
  })

  it("groups the last 12 months by UTC month and leaves out older orders", async () => {
    const { bucket, currencies } = await executeQuery(revenueQuery({ range: TIME_RANGE.LAST_12_MONTHS }))

    expect(bucket).toBe(TIME_BUCKET.MONTH)
    expect(currencies.map(({ currency, net, orders }) => [currency, net, orders])).toStrictEqual([
      ["EUR", 779.2, 3],
      ["USD", 249, 3],
      ["JPY", 37_000, 1],
    ])
    const [eur] = currencies
    expect(eur?.points).toHaveLength(12)
    expect(eur?.points.at(0)?.start).toStrictEqual(new Date("2025-12-01T00:00:00.000Z"))
    expect(valueOn(eur?.points ?? [], "2026-10-01T00:00:00.000Z")).toBe(60)
    expect(valueOn(eur?.points ?? [], "2026-11-01T00:00:00.000Z")).toBe(719.2)
  })

  it("answers no currencies when no order was paid in the period", async () => {
    await db.delete(order)

    await expect(executeQuery(revenueQuery())).resolves.toStrictEqual({ bucket: TIME_BUCKET.DAY, currencies: [] })
  })

  it("reads the last 30 days when no period is given", async () => {
    const { currencies } = await executeQuery(revenueQuery({ range: undefined }))

    expect(currencies.map(({ currency }) => currency)).toStrictEqual(["USD", "EUR"])
  })

  it("rejects a caller without the permission to read orders", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: ADMIN_ID }))

    await expect(executeQuery(revenueQuery())).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(revenueQuery())).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
