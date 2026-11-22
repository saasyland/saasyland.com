import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import {
  ADMIN_ID,
  AGENCY_PRODUCT_ID,
  BUYER_ID,
  CORE_PRODUCT_ID,
  LAUNCH_DISCOUNT,
  ORDERS,
  ORDER_USERS,
  PARTNER_DISCOUNT,
} from "~/src/modules/order/__test__/fixtures/order-buyers"
import { order } from "~/src/modules/order/order.schema"
import { orderFiltersQuery } from "~/src/modules/order/use-cases/get-order-filters"
import { user } from "~/src/modules/user/user.schema"

beforeEach(async () => {
  await db.delete(order)
  await db.delete(user)
  await db.insert(user).values(ORDER_USERS)
  await db.insert(order).values([
    ...ORDERS,
    orderRow({
      description: "Core (old name)",
      id: "ord_old_name",
      placedAt: new Date("2025-01-01T00:00:00.000Z"),
      productId: CORE_PRODUCT_ID,
    }),
    orderRow({ description: "Custom invoice", id: "ord_without_product", productId: null }),
    orderRow({
      billingCountry: "ZZ",
      description: "Core",
      discountAmount: 500,
      discountCode: "SPRING",
      discountId: LAUNCH_DISCOUNT.id,
      discountName: "Launch week",
      id: "ord_renamed_code",
      placedAt: new Date("2026-11-20T00:00:00.000Z"),
      productId: CORE_PRODUCT_ID,
    }),
  ])
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_ID }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-order-filters", () => {
  it("lists each product and discount used once, named as its newest order names it, and each billing country", async () => {
    await expect(executeQuery(orderFiltersQuery)).resolves.toStrictEqual({
      countries: ["DE", "FR"],
      discounts: [
        { code: "SPRING", id: LAUNCH_DISCOUNT.id, name: "Launch week" },
        { code: null, id: PARTNER_DISCOUNT.id, name: PARTNER_DISCOUNT.name },
      ],
      products: [
        { id: AGENCY_PRODUCT_ID, name: "Agency" },
        { id: CORE_PRODUCT_ID, name: "Core" },
      ],
    })
  })

  it("rejects a caller without the permission to read orders", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: BUYER_ID }))

    await expect(executeQuery(orderFiltersQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
