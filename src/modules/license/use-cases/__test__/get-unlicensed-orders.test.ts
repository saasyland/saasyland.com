import { env } from "cloudflare:workers"

import { inArray } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { license, revokedLicenseOrder } from "~/src/modules/license/license.schema"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"
import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import { order } from "~/src/modules/order/order.schema"
import { user } from "~/src/modules/user/user.schema"

import { POLAR_DASHBOARD_HOSTS, POLAR_ORGANIZATION_SLUG } from "~/src/data/polar"

const ADMIN_ID = "01900000-0000-7000-8000-000000000021"
const BUYER_ID = "01900000-0000-7000-8000-000000000022"
const LINKED_BUYER_ID = "01900000-0000-7000-8000-000000000023"
const OTHER_PRODUCT_ID = "00000000-0000-4000-8000-00000000ffff"

const UNMATCHED = orderRow({
  currency: "eur",
  customerId: "cus_unmatched",
  id: "ord_unmatched",
  placedAt: new Date("2026-11-16T09:00:00.000Z"),
  productId: POLAR_PRODUCT_IDS[LICENSE_TIER.AGENCY],
  totalAmount: 71_920,
})

const LATER_UNMATCHED = orderRow({
  currency: "jpy",
  customerId: "cus_later",
  id: "ord_later",
  placedAt: new Date("2026-11-17T09:00:00.000Z"),
  productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE],
  totalAmount: 37_000,
})

const LICENSED = orderRow({ id: "ord_licensed", productId: POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE], userId: BUYER_ID })
const REVOKED = orderRow({ id: "ord_revoked", productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE], userId: BUYER_ID })
const REFUNDED = orderRow({ id: "ord_refunded", productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE], status: POLAR_ORDER_STATUS.REFUNDED })
const PARTIALLY_REFUNDED = orderRow({
  id: "ord_partially_refunded",
  productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE],
  status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
})
const PENDING = orderRow({ id: "ord_pending", productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE], status: POLAR_ORDER_STATUS.PENDING })
const OTHER_PRODUCT = orderRow({ id: "ord_other_product", productId: OTHER_PRODUCT_ID })

const dashboardUrl = (orderId: string): string =>
  `https://${POLAR_DASHBOARD_HOSTS[env.POLAR_SERVER]}/dashboard/${POLAR_ORGANIZATION_SLUG}/sales/${orderId}`

beforeEach(async () => {
  await db.delete(order)
  await db.delete(revokedLicenseOrder)
  await db.delete(license)
  await db.delete(user)
  await db.insert(user).values([
    { email: "admin@example.test", id: ADMIN_ID, name: "Admin", role: ROLE_CODES.ADMIN },
    { email: "buyer@example.test", id: BUYER_ID, name: "Buyer", role: ROLE_CODES.CUSTOMER },
    { email: "linked@example.test", id: LINKED_BUYER_ID, name: "Linked buyer", role: ROLE_CODES.CUSTOMER },
  ])
  await db.insert(order).values([UNMATCHED, LATER_UNMATCHED, LICENSED, REVOKED, REFUNDED, PARTIALLY_REFUNDED, PENDING, OTHER_PRODUCT])
  await db.insert(license).values({
    id: "buyer-license",
    polarCustomerId: LICENSED.customerId,
    polarOrderId: LICENSED.id,
    status: LICENSE_STATUS.ACTIVE,
    tier: LICENSE_TIER.COMPLETE,
    userId: BUYER_ID,
  })
  await db.insert(revokedLicenseOrder).values({ polarOrderId: REVOKED.id, userId: BUYER_ID })
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_ID }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-unlicensed-orders", () => {
  it("lists the paid licence orders without a licence, newest first, with their amount and their page in Polar", async () => {
    await expect(executeQuery(unlicensedOrdersQuery)).resolves.toStrictEqual({
      rows: [
        {
          amount: 37_000,
          currency: "JPY",
          customerId: LATER_UNMATCHED.customerId,
          id: LATER_UNMATCHED.id,
          placedAt: LATER_UNMATCHED.placedAt,
          polarUrl: dashboardUrl(LATER_UNMATCHED.id),
        },
        {
          amount: 719.2,
          currency: "EUR",
          customerId: UNMATCHED.customerId,
          id: UNMATCHED.id,
          placedAt: UNMATCHED.placedAt,
          polarUrl: dashboardUrl(UNMATCHED.id),
        },
      ],
    })
  })

  it("drops an order once its licence is granted", async () => {
    await db.insert(license).values({
      id: "linked-license",
      polarCustomerId: UNMATCHED.customerId,
      polarOrderId: UNMATCHED.id,
      tier: LICENSE_TIER.AGENCY,
      userId: LINKED_BUYER_ID,
    })

    const { rows } = await executeQuery(unlicensedOrdersQuery)

    expect(rows.map(({ id }) => id)).toStrictEqual([LATER_UNMATCHED.id])
  })

  it("answers an empty list when every paid licence order has its licence", async () => {
    await db.delete(order).where(inArray(order.id, [UNMATCHED.id, LATER_UNMATCHED.id]))

    await expect(executeQuery(unlicensedOrdersQuery)).resolves.toStrictEqual({ rows: [] })
  })

  it("rejects a caller without the permission to read orders", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: BUYER_ID }))

    await expect(executeQuery(unlicensedOrdersQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(unlicensedOrdersQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
