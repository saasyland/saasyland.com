import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
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
  PAID_CORE,
  PARTLY_REFUNDED_AGENCY,
} from "~/src/modules/order/__test__/fixtures/order-buyers"
import { order } from "~/src/modules/order/order.schema"
import { currentOrdersQuery } from "~/src/modules/order/use-cases/get-current-orders"
import { user } from "~/src/modules/user/user.schema"

const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"

const signInAs = (userId: string, role: string = ROLE_CODES.CUSTOMER): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId }))
}

beforeEach(async () => {
  await db.delete(order)
  await db.delete(user)
  await db.insert(user).values(ORDER_USERS)
  await db.insert(order).values([{ ...PAID_CORE, checkoutId: CHECKOUT_ID }, ...ORDERS.filter(({ id }) => id !== PAID_CORE.id)])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-current-orders", () => {
  it("lists the signed-in account's own orders newest first, with the checkout each came from and its invoice number", async () => {
    signInAs(BUYER_ID)

    await expect(executeQuery(currentOrdersQuery)).resolves.toStrictEqual({
      orders: [
        {
          checkoutId: CHECKOUT_ID,
          description: "Core",
          id: PAID_CORE.id,
          invoiceNumber: PAID_CORE.invoiceNumber,
          placedAt: PAID_CORE.placedAt,
          refunded: { amount: 0, currency: "USD" },
          status: POLAR_ORDER_STATUS.PAID,
          total: { amount: 199, currency: "USD" },
        },
        {
          checkoutId: JSON_NULL,
          description: "Agency",
          id: PARTLY_REFUNDED_AGENCY.id,
          invoiceNumber: PARTLY_REFUNDED_AGENCY.invoiceNumber,
          placedAt: PARTLY_REFUNDED_AGENCY.placedAt,
          refunded: { amount: 200, currency: "EUR" },
          status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
          total: { amount: 719.2, currency: "EUR" },
        },
      ],
    })
  })

  it("shows an administrator only their own orders, never another account's", async () => {
    signInAs(ADMIN_ID, ROLE_CODES.ADMIN)

    await expect(executeQuery(currentOrdersQuery)).resolves.toStrictEqual({ orders: [] })
  })

  it("refuses a visitor who is not signed in", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(null)

    await expect(executeQuery(currentOrdersQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
