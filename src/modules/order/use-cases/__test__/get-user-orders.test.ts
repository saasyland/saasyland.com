import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  ADMIN_ID,
  BUYER_ID,
  ORDERS,
  ORDER_USERS,
  OTHER_BUYER_ID,
  PAID_CORE,
  PARTLY_REFUNDED_AGENCY,
} from "~/src/modules/order/__test__/fixtures/order-buyers"
import { order } from "~/src/modules/order/order.schema"
import { userOrdersQuery } from "~/src/modules/order/use-cases/get-user-orders"
import { user } from "~/src/modules/user/user.schema"

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

describe("get-user-orders", () => {
  it("lists an account's orders newest first with what it paid after refunds per currency", async () => {
    await expect(executeQuery(userOrdersQuery({ userId: BUYER_ID }))).resolves.toStrictEqual({
      orders: [
        {
          description: "Core",
          id: PAID_CORE.id,
          placedAt: PAID_CORE.placedAt,
          refunded: { amount: 0, currency: "USD" },
          status: POLAR_ORDER_STATUS.PAID,
          total: { amount: 199, currency: "USD" },
        },
        {
          description: "Agency",
          id: PARTLY_REFUNDED_AGENCY.id,
          placedAt: PARTLY_REFUNDED_AGENCY.placedAt,
          refunded: { amount: 200, currency: "EUR" },
          status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
          total: { amount: 719.2, currency: "EUR" },
        },
      ],
      revenue: [
        { amount: 519.2, currency: "EUR" },
        { amount: 199, currency: "USD" },
      ],
    })
  })

  it("leaves a pending order out of what the account paid", async () => {
    const { orders, revenue } = await executeQuery(userOrdersQuery({ userId: OTHER_BUYER_ID }))

    expect(orders).toHaveLength(1)
    expect(revenue).toStrictEqual([])
  })

  it("rejects a caller without the permission to read orders", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: BUYER_ID }))

    await expect(executeQuery(userOrdersQuery({ userId: BUYER_ID }))).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
