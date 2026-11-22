import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import {
  ADMIN_ID,
  BUYER_ID,
  CORE_PRODUCT_ID,
  LAUNCH_DISCOUNT,
  ORDERS,
  ORDER_USERS,
  PAID_CORE,
  PARTLY_REFUNDED_AGENCY,
  PARTNER_DISCOUNT,
  PENDING_CORE,
  REFUNDED_GUEST,
} from "~/src/modules/order/__test__/fixtures/order-buyers"
import { ORDER_DISCOUNT_FILTER } from "~/src/modules/order/order.constants"
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
      billingCountry: "FR",
      customerId: PARTLY_REFUNDED_AGENCY.customerId,
      description: "Agency",
      discount: undefined,
      id: PARTLY_REFUNDED_AGENCY.id,
      placedAt: PARTLY_REFUNDED_AGENCY.placedAt,
      refunded: { amount: 200, currency: "EUR" },
      status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
      total: { amount: 719.2, currency: "EUR" },
      user: { email: "ada@example.test", id: BUYER_ID, name: "Ada Buyer" },
    })
    expect(rows[3]?.user).toBeNull()
    expect(rows[0]).toMatchObject({
      billingCountry: "DE",
      discount: {
        amount: { amount: 49.75, currency: "USD" },
        code: LAUNCH_DISCOUNT.code,
        id: LAUNCH_DISCOUNT.id,
        name: LAUNCH_DISCOUNT.name,
      },
    })
    expect(rows[1]).toMatchObject({ billingCountry: undefined, discount: undefined })
  })

  it("pages and sorts on the server", async () => {
    await expect(idsOf({ pageIndex: 1, pageSize: 3 })).resolves.toStrictEqual([REFUNDED_GUEST.id])
    await expect(idsOf({ sorting: [{ desc: false, id: "totalAmount" }] })).resolves.toStrictEqual([
      PAID_CORE.id,
      PENDING_CORE.id,
      REFUNDED_GUEST.id,
      PARTLY_REFUNDED_AGENCY.id,
    ])
    await expect(idsOf({ sorting: [{ desc: true, id: "refundedAmount" }] })).resolves.toStrictEqual([
      REFUNDED_GUEST.id,
      PARTLY_REFUNDED_AGENCY.id,
      PAID_CORE.id,
      PENDING_CORE.id,
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
    await expect(idsOf({ search: "GRACE@" })).resolves.toStrictEqual([PENDING_CORE.id])
    await expect(idsOf({ search: "ada buyer" })).resolves.toStrictEqual([PAID_CORE.id, PARTLY_REFUNDED_AGENCY.id])
    await expect(idsOf({ search: "cus_guest" })).resolves.toStrictEqual([REFUNDED_GUEST.id])
    await expect(idsOf({ search: "agency" })).resolves.toStrictEqual([PARTLY_REFUNDED_AGENCY.id, REFUNDED_GUEST.id])
    await expect(idsOf({ search: "ord_pending" })).resolves.toStrictEqual([PENDING_CORE.id])
    await expect(idsOf({ search: "100%" })).resolves.toStrictEqual([])
    await expect(idsOf({ search: "   " })).resolves.toHaveLength(ORDERS.length)
  })

  it("filters by the customer's name, email or Polar ID alone", async () => {
    await expect(idsOf({ filters: { customer: "ada@" } })).resolves.toStrictEqual([PAID_CORE.id, PARTLY_REFUNDED_AGENCY.id])
    await expect(idsOf({ filters: { customer: "cus_guest" } })).resolves.toStrictEqual([REFUNDED_GUEST.id])
    await expect(idsOf({ filters: { customer: "agency" } })).resolves.toStrictEqual([])
    await expect(idsOf({ filters: { customer: "" } })).resolves.toHaveLength(ORDERS.length)
  })

  it("filters by any of several statuses, products and countries, and counts only the matching orders", async () => {
    await expect(idsOf({ filters: { status: [POLAR_ORDER_STATUS.PENDING] } })).resolves.toStrictEqual([PENDING_CORE.id])
    await expect(idsOf({ filters: { status: [POLAR_ORDER_STATUS.PENDING, POLAR_ORDER_STATUS.REFUNDED] } })).resolves.toStrictEqual([
      PENDING_CORE.id,
      REFUNDED_GUEST.id,
    ])
    await expect(idsOf({ filters: { product: [CORE_PRODUCT_ID] } })).resolves.toStrictEqual([PAID_CORE.id, PENDING_CORE.id])
    await expect(idsOf({ filters: { country: ["DE", "fr"] } })).resolves.toStrictEqual([
      PAID_CORE.id,
      PARTLY_REFUNDED_AGENCY.id,
      REFUNDED_GUEST.id,
    ])
    await expect(idsOf({ filters: { country: [], product: [], status: [] } })).resolves.toHaveLength(ORDERS.length)

    const { total } = await executeQuery(getOrdersPageQuery({ filters: { product: [CORE_PRODUCT_ID], status: [POLAR_ORDER_STATUS.PAID] } }))

    expect(total).toBe(1)
  })
})

describe("get-orders ranges and choices", () => {
  it("filters by the day range the order was placed in, open at either end", async () => {
    const from = new Date("2026-10-01T00:00:00.000Z").getTime()
    const to = new Date("2026-11-18T23:59:59.999Z").getTime()

    await expect(idsOf({ filters: { placedAt: { from, to } } })).resolves.toStrictEqual([PENDING_CORE.id, PARTLY_REFUNDED_AGENCY.id])
    await expect(idsOf({ filters: { placedAt: { from } } })).resolves.toStrictEqual([
      PAID_CORE.id,
      PENDING_CORE.id,
      PARTLY_REFUNDED_AGENCY.id,
    ])
    await expect(idsOf({ filters: { placedAt: { to } } })).resolves.toStrictEqual([
      PENDING_CORE.id,
      PARTLY_REFUNDED_AGENCY.id,
      REFUNDED_GUEST.id,
    ])
    await expect(idsOf({ filters: { placedAt: {} } })).resolves.toHaveLength(ORDERS.length)
  })

  it("filters by a total range in each order's own currency, the bounds included", async () => {
    await expect(idsOf({ filters: { totalAmount: { max: 199, min: 199 } } })).resolves.toStrictEqual([PAID_CORE.id, PENDING_CORE.id])
    await expect(idsOf({ filters: { totalAmount: { min: 500 } } })).resolves.toStrictEqual([PARTLY_REFUNDED_AGENCY.id])
    await expect(idsOf({ filters: { totalAmount: { max: 499 } } })).resolves.toStrictEqual([
      PAID_CORE.id,
      PENDING_CORE.id,
      REFUNDED_GUEST.id,
    ])
    await expect(idsOf({ filters: { totalAmount: {} } })).resolves.toHaveLength(ORDERS.length)
  })

  it("compares a total in a currency without minor units as whole units", async () => {
    await db.insert(order).values(orderRow({ currency: "jpy", id: "ord_yen", placedAt: NOW, totalAmount: 30_000 }))

    await expect(idsOf({ filters: { totalAmount: { max: 30_000, min: 30_000 } } })).resolves.toStrictEqual(["ord_yen"])
  })

  it("filters by whether a discount applied, by one discount and by the billing country", async () => {
    await expect(idsOf({ filters: { discount: ORDER_DISCOUNT_FILTER.ANY } })).resolves.toStrictEqual([PAID_CORE.id, REFUNDED_GUEST.id])
    await expect(idsOf({ filters: { discount: ORDER_DISCOUNT_FILTER.NONE } })).resolves.toStrictEqual([
      PENDING_CORE.id,
      PARTLY_REFUNDED_AGENCY.id,
    ])
    await expect(idsOf({ filters: { discount: PARTNER_DISCOUNT.id } })).resolves.toStrictEqual([REFUNDED_GUEST.id])
    await expect(
      idsOf({ filters: { country: ["DE"], discount: ORDER_DISCOUNT_FILTER.ANY, status: [POLAR_ORDER_STATUS.PAID] } }),
    ).resolves.toStrictEqual([PAID_CORE.id])
  })

  it("refuses a status, country, range or sort column it does not know", () => {
    expect(() => getOrdersPageQuery({ filters: { country: ["XX"] } })).toThrow()
    expect(() => getOrdersPageQuery({ filters: { status: ["lost"] } })).toThrow()
    expect(() => getOrdersPageQuery({ filters: { placedAt: { from: 0.5 } } })).toThrow()
    expect(() => getOrdersPageQuery({ filters: { totalAmount: { min: Number.POSITIVE_INFINITY } } })).toThrow()
    expect(() => getOrdersPageQuery({ sorting: [{ desc: false, id: "customer" }] })).toThrow()
  })

  it("rejects a caller without the permission to read orders", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: BUYER_ID }))

    await expect(executeQuery(getOrdersQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
