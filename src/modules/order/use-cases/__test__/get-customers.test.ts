import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { FLAG_FILTER } from "~/src/modules/_core/utils/pagination"
import {
  ADMIN_ID,
  BUYER_ID,
  ORDERS,
  ORDER_USERS,
  OTHER_BUYER_ID,
  PAID_CORE,
  PENDING_CORE,
  REFUNDED_GUEST,
} from "~/src/modules/order/__test__/fixtures/order-buyers"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { getCustomersPageQuery, getCustomersQuery } from "~/src/modules/order/use-cases/get-customers"
import { user } from "~/src/modules/user/user.schema"

const customerIdsOf = async (input: Order["getCustomers"]): Promise<string[]> => {
  const { rows } = await executeQuery(getCustomersPageQuery(input))
  return rows.map(({ id }) => id)
}

const day = (iso: string): number => new Date(iso).getTime()

beforeEach(async () => {
  await db.delete(order)
  await db.delete(user)
  await db.insert(user).values(ORDER_USERS)
  await db.insert(order).values(ORDERS)
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_ID }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-customers", () => {
  it("groups the orders by Polar customer, with the account, the order count and what was paid after refunds per currency", async () => {
    const { rows, total } = await executeQuery(getCustomersQuery)

    expect(total).toBe(3)
    expect(rows).toStrictEqual([
      {
        customerId: PAID_CORE.customerId,
        id: PAID_CORE.customerId,
        lastOrderAt: PAID_CORE.placedAt,
        orders: 2,
        revenue: [
          { amount: 519.2, currency: "EUR" },
          { amount: 199, currency: "USD" },
        ],
        user: {
          createdAt: new Date("2026-01-05T08:00:00.000Z"),
          email: "ada@example.test",
          emailVerified: true,
          id: BUYER_ID,
          name: "Ada Buyer",
        },
      },
      {
        customerId: PENDING_CORE.customerId,
        id: PENDING_CORE.customerId,
        lastOrderAt: PENDING_CORE.placedAt,
        orders: 1,
        revenue: [],
        user: {
          createdAt: new Date("2026-03-05T08:00:00.000Z"),
          email: "grace@example.test",
          emailVerified: false,
          id: OTHER_BUYER_ID,
          name: "Grace Buyer",
        },
      },
      {
        customerId: REFUNDED_GUEST.customerId,
        id: REFUNDED_GUEST.customerId,
        lastOrderAt: REFUNDED_GUEST.placedAt,
        orders: 1,
        revenue: [{ amount: 0, currency: "USD" }],
        user: null,
      },
    ])
  })

  it("keeps the account of a customer whose first orders arrived before the account was linked", async () => {
    await db.insert(order).values({ ...PAID_CORE, id: "ord_before_link", userId: JSON_NULL })

    const { rows } = await executeQuery(getCustomersQuery)

    expect(rows[0]?.orders).toBe(3)
    expect(rows[0]?.user?.id).toBe(BUYER_ID)
  })

  it("sorts and pages on the server, and searches the account and the Polar customer", async () => {
    await expect(customerIdsOf({ sorting: [{ desc: false, id: "customer" }] })).resolves.toStrictEqual([
      "cus_ada",
      "cus_guest",
      "cus_grace",
    ])
    await expect(customerIdsOf({ sorting: [{ desc: true, id: "orders" }] })).resolves.toStrictEqual(["cus_ada", "cus_grace", "cus_guest"])
    await expect(customerIdsOf({ sorting: [{ desc: false, id: "lastOrderAt" }] })).resolves.toStrictEqual([
      "cus_guest",
      "cus_grace",
      "cus_ada",
    ])
    await expect(customerIdsOf({ sorting: [{ desc: true, id: "signedUpAt" }] })).resolves.toStrictEqual([
      "cus_grace",
      "cus_ada",
      "cus_guest",
    ])
    await expect(customerIdsOf({ pageIndex: 1, pageSize: 2 })).resolves.toStrictEqual(["cus_guest"])
    await expect(customerIdsOf({ filters: { customer: "Grace" } })).resolves.toStrictEqual(["cus_grace"])
    await expect(customerIdsOf({ filters: { customer: "ada@" } })).resolves.toStrictEqual(["cus_ada"])
    await expect(customerIdsOf({ filters: { customer: "cus_gu" } })).resolves.toStrictEqual(["cus_guest"])
    await expect(customerIdsOf({ filters: { customer: " " } })).resolves.toHaveLength(3)

    const { total } = await executeQuery(getCustomersPageQuery({ filters: { customer: "buyer" } }))

    expect(total).toBe(2)
  })

  it("searches every customer and filters them by account, verification, order count, last order and sign-up", async () => {
    await expect(customerIdsOf({ search: "grace" })).resolves.toStrictEqual(["cus_grace"])
    await expect(customerIdsOf({ filters: { emailVerified: FLAG_FILTER.YES } })).resolves.toStrictEqual(["cus_ada"])
    await expect(customerIdsOf({ filters: { emailVerified: FLAG_FILTER.NO } })).resolves.toStrictEqual(["cus_grace"])
    await expect(customerIdsOf({ filters: { orders: { min: 2 } } })).resolves.toStrictEqual(["cus_ada"])
    await expect(customerIdsOf({ filters: { orders: { max: 1 } } })).resolves.toStrictEqual(["cus_grace", "cus_guest"])
    await expect(customerIdsOf({ filters: { signedUpAt: { from: day("2026-03-01T00:00:00.000Z") } } })).resolves.toStrictEqual([
      "cus_grace",
    ])
    await expect(customerIdsOf({ filters: { signedUpAt: { to: day("2026-02-01T00:00:00.000Z") } } })).resolves.toStrictEqual(["cus_ada"])
    await expect(customerIdsOf({ filters: { lastOrderAt: { from: PAID_CORE.placedAt.getTime() } } })).resolves.toStrictEqual(["cus_ada"])
    await expect(customerIdsOf({ filters: { lastOrderAt: { to: REFUNDED_GUEST.placedAt.getTime() } } })).resolves.toStrictEqual([
      "cus_guest",
    ])
  })

  it("answers an empty page when nobody has ordered", async () => {
    await db.delete(order)

    await expect(executeQuery(getCustomersQuery)).resolves.toStrictEqual({ rows: [], total: 0 })
  })

  it("rejects a caller without the permission to read orders", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: BUYER_ID }))

    await expect(executeQuery(getCustomersQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
