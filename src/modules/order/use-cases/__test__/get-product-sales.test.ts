import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import { order } from "~/src/modules/order/order.schema"
import { productSalesQuery } from "~/src/modules/order/use-cases/get-product-sales"

const ADMIN_ID = "01900000-0000-7000-8000-000000000051"
const STARTER_ID = "00000000-0000-4000-8000-0000000000e1"
const TEAM_ID = "00000000-0000-4000-8000-0000000000e2"
const UNSOLD_ID = "00000000-0000-4000-8000-0000000000e3"

const ORDERS = [
  orderRow({ productId: STARTER_ID, totalAmount: 14_900 }),
  orderRow({ productId: STARTER_ID, refundedAmount: 4900, status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED, totalAmount: 14_900 }),
  orderRow({ currency: "eur", productId: STARTER_ID, totalAmount: 13_900 }),
  orderRow({ productId: TEAM_ID, refundedAmount: 29_900, status: POLAR_ORDER_STATUS.REFUNDED, totalAmount: 29_900 }),
  orderRow({ currency: "jpy", productId: TEAM_ID, totalAmount: 30_000 }),
  orderRow({ productId: UNSOLD_ID, status: POLAR_ORDER_STATUS.PENDING, totalAmount: 50_000 }),
  orderRow({ productId: UNSOLD_ID, status: POLAR_ORDER_STATUS.DRAFT, totalAmount: 50_000 }),
  orderRow({ productId: UNSOLD_ID, status: POLAR_ORDER_STATUS.VOID, totalAmount: 50_000 }),
  orderRow({ productId: JSON_NULL, totalAmount: 9900 }),
]

beforeEach(async () => {
  await db.delete(order)
  await db.insert(order).values(ORDERS)
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_ID }))
})

describe("get-product-sales", () => {
  it("counts each product's paid orders, refunded ones included, and adds up what they paid after refunds per currency", async () => {
    const { products } = await executeQuery(productSalesQuery)

    expect(products.toSorted((first, second) => first.productId.localeCompare(second.productId))).toStrictEqual([
      {
        productId: STARTER_ID,
        revenue: [
          { amount: 139, currency: "EUR" },
          { amount: 249, currency: "USD" },
        ],
        sales: 3,
      },
      {
        productId: TEAM_ID,
        revenue: [
          { amount: 30_000, currency: "JPY" },
          { amount: 0, currency: "USD" },
        ],
        sales: 2,
      },
    ])
  })

  it("leaves out products with only pending, draft or void orders, and orders that name no product", async () => {
    const { products } = await executeQuery(productSalesQuery)

    expect(products.map(({ productId }) => productId)).not.toContain(UNSOLD_ID)
    expect(products).toHaveLength(2)
  })

  it("rejects a caller without the permission to read orders", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: ADMIN_ID }))

    await expect(executeQuery(productSalesQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(productSalesQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
