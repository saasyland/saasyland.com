import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { TIME_RANGE } from "~/src/modules/_core/utils/time-series"
import {
  ADMIN_ID,
  BUYER_ID,
  CORE_PRODUCT_ID,
  ORDERS,
  ORDER_USERS,
  PAID_CORE,
  PARTLY_REFUNDED_AGENCY,
  PENDING_CORE,
  REFUNDED_GUEST,
} from "~/src/modules/order/__test__/fixtures/order-buyers"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { getOrdersPageQuery, getOrdersQuery } from "~/src/modules/order/use-cases/get-orders"
import { user } from "~/src/modules/user/user.schema"

const NOW = new Date("2026-11-20T15:00:00.000Z")

const idsOf = async (input: Order["getOrders"]): Promise<string[]> => {
  const { rows } = await executeQuery(getOrdersPageQuery(input))
  return rows.map(({ id }) => id)
}

beforeEach(async () => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  await db.delete(order)
  await db.delete(user)
  await db.insert(user).values(ORDER_USERS)
  await db.insert(order).values(ORDERS)
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_ID }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("get-orders", () => {
  it("lists every order newest first with its account, amounts in major units and the total", async () => {
    const { rows, total } = await executeQuery(getOrdersQuery)

    expect(total).toBe(ORDERS.length)
    expect(rows.map(({ id }) => id)).toStrictEqual([PAID_CORE.id, PENDING_CORE.id, PARTLY_REFUNDED_AGENCY.id, REFUNDED_GUEST.id])
    expect(rows[2]).toStrictEqual({
      customerId: PARTLY_REFUNDED_AGENCY.customerId,
      description: "Agency",
      id: PARTLY_REFUNDED_AGENCY.id,
      placedAt: PARTLY_REFUNDED_AGENCY.placedAt,
      refunded: { amount: 200, currency: "EUR" },
      status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
      total: { amount: 719.2, currency: "EUR" },
      user: { email: "ada@example.test", id: BUYER_ID, name: "Ada Buyer" },
    })
    expect(rows[3]?.user).toBeNull()
  })

  it("pages and sorts on the server", async () => {
    await expect(idsOf({ pageIndex: 1, pageSize: 3 })).resolves.toStrictEqual([REFUNDED_GUEST.id])
    await expect(idsOf({ sorting: [{ desc: false, id: "totalAmount" }] })).resolves.toStrictEqual([
      PAID_CORE.id,
      PENDING_CORE.id,
      REFUNDED_GUEST.id,
      PARTLY_REFUNDED_AGENCY.id,
    ])
    await expect(idsOf({ sorting: [{ desc: true, id: "status" }] })).resolves.toStrictEqual([
      REFUNDED_GUEST.id,
      PENDING_CORE.id,
      PARTLY_REFUNDED_AGENCY.id,
      PAID_CORE.id,
    ])
    await expect(idsOf({ sorting: [{ desc: false, id: "placedAt" }] })).resolves.toStrictEqual([
      REFUNDED_GUEST.id,
      PARTLY_REFUNDED_AGENCY.id,
      PENDING_CORE.id,
      PAID_CORE.id,
    ])
  })

  it("searches the order, the Polar customer, the product and the account's name and email", async () => {
    await expect(idsOf({ filters: { customer: "GRACE@" } })).resolves.toStrictEqual([PENDING_CORE.id])
    await expect(idsOf({ filters: { customer: "ada buyer" } })).resolves.toStrictEqual([PAID_CORE.id, PARTLY_REFUNDED_AGENCY.id])
    await expect(idsOf({ filters: { customer: "cus_guest" } })).resolves.toStrictEqual([REFUNDED_GUEST.id])
    await expect(idsOf({ filters: { customer: "agency" } })).resolves.toStrictEqual([PARTLY_REFUNDED_AGENCY.id, REFUNDED_GUEST.id])
    await expect(idsOf({ filters: { customer: "ord_pending" } })).resolves.toStrictEqual([PENDING_CORE.id])
    await expect(idsOf({ filters: { customer: "100%" } })).resolves.toStrictEqual([])
    await expect(idsOf({ filters: { customer: "   " } })).resolves.toHaveLength(ORDERS.length)
  })

  it("filters by status, product and period, and counts only the matching orders", async () => {
    await expect(idsOf({ filters: { status: POLAR_ORDER_STATUS.PENDING } })).resolves.toStrictEqual([PENDING_CORE.id])
    await expect(idsOf({ filters: { product: CORE_PRODUCT_ID } })).resolves.toStrictEqual([PAID_CORE.id, PENDING_CORE.id])
    await expect(idsOf({ filters: { placedAt: TIME_RANGE.LAST_7_DAYS } })).resolves.toStrictEqual([PAID_CORE.id, PENDING_CORE.id])
    await expect(
      idsOf({ filters: { placedAt: TIME_RANGE.LAST_12_MONTHS, product: CORE_PRODUCT_ID, status: POLAR_ORDER_STATUS.PAID } }),
    ).resolves.toStrictEqual([PAID_CORE.id])

    const { total } = await executeQuery(getOrdersPageQuery({ filters: { placedAt: TIME_RANGE.LAST_12_MONTHS } }))

    expect(total).toBe(3)
  })

  it("refuses a status, period or sort column it does not know", () => {
    expect(() => getOrdersPageQuery({ filters: { status: "lost" } })).toThrow()
    expect(() => getOrdersPageQuery({ filters: { placedAt: "1d" } })).toThrow()
    expect(() => getOrdersPageQuery({ sorting: [{ desc: false, id: "customer" }] })).toThrow()
  })

  it("rejects a caller without the permission to read orders", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: BUYER_ID }))

    await expect(executeQuery(getOrdersQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
