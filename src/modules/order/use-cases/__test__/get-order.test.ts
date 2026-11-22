import { env } from "cloudflare:workers"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { polarOrderDiscount } from "~/src/platform/testing/lib/polar"
import { executeQuery } from "~/src/platform/testing/lib/query"
import { createPolarOrder, polarInvoiceUrl } from "~/src/platform/testing/mocks/polar"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { ADMIN_ID, BUYER_ID, ORDERS, ORDER_USERS, PAID_CORE, REFUNDED_GUEST } from "~/src/modules/order/__test__/fixtures/order-buyers"
import { POLAR_READ } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { getOrderQuery } from "~/src/modules/order/use-cases/get-order"
import { user } from "~/src/modules/user/user.schema"

import { POLAR_DASHBOARD_HOSTS, POLAR_ORGANIZATION_SLUG } from "~/src/data/polar"

const dashboardUrl = (orderId: string): string =>
  `https://${POLAR_DASHBOARD_HOSTS[env.POLAR_SERVER]}/dashboard/${POLAR_ORGANIZATION_SLUG}/sales/${orderId}`

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

describe("get-order", () => {
  it("joins the saved copy with Polar's live order, its discount, billing address and invoice", async () => {
    createPolarOrder(
      { externalCustomerId: BUYER_ID, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] },
      {
        billing_address: { country: "DE" },
        billing_name: "Ada GmbH",
        discount: polarOrderDiscount({ basisPoints: 2000, code: "LAUNCH", name: "Launch week", organizationId: env.POLAR_ORGANIZATION_ID }),
        discount_amount: 4975,
        id: PAID_CORE.id,
        is_invoice_generated: true,
        net_amount: 19_900,
        refunded_amount: 1000,
        refunded_tax_amount: 160,
        subtotal_amount: 24_875,
        tax_amount: 3781,
        total_amount: 23_681,
      },
    )

    const { order: copy, polar, polarUrl } = await executeQuery(getOrderQuery({ orderId: PAID_CORE.id }))

    expect(copy).toStrictEqual({
      changedAt: PAID_CORE.changedAt,
      customerId: PAID_CORE.customerId,
      description: "Core",
      id: PAID_CORE.id,
      invoiceNumber: PAID_CORE.invoiceNumber,
      placedAt: PAID_CORE.placedAt,
      productId: PAID_CORE.productId,
      refunded: { amount: 0, currency: "USD" },
      status: POLAR_ORDER_STATUS.PAID,
      subscriptionId: null,
      total: { amount: 199, currency: "USD" },
      user: { email: "ada@example.test", id: BUYER_ID, name: "Ada Buyer" },
    })
    expect(polarUrl).toBe(dashboardUrl(PAID_CORE.id))
    expect(polar).toStrictEqual({
      amounts: {
        discount: { amount: 49.75, currency: "USD" },
        net: { amount: 199, currency: "USD" },
        refunded: { amount: 10, currency: "USD" },
        refundedTax: { amount: 1.6, currency: "USD" },
        subtotal: { amount: 248.75, currency: "USD" },
        tax: { amount: 37.81, currency: "USD" },
        total: { amount: 236.81, currency: "USD" },
      },
      billingCountry: "DE",
      billingName: "Ada GmbH",
      customerEmail: `${BUYER_ID}@example.test`,
      customerName: null,
      discountCode: "LAUNCH",
      discountName: "Launch week",
      invoiceUrl: polarInvoiceUrl(PAID_CORE.id),
      orderStatus: POLAR_ORDER_STATUS.PAID,
      read: POLAR_READ.AVAILABLE,
    })
  })

  it("reads an order without a discount, billing address or invoice", async () => {
    createPolarOrder({ externalCustomerId: BUYER_ID, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] }, { id: PAID_CORE.id })

    const { polar } = await executeQuery(getOrderQuery({ orderId: PAID_CORE.id }))

    expect(polar).toMatchObject({ billingCountry: undefined, discountCode: undefined, discountName: undefined, invoiceUrl: undefined })
  })

  it("falls back to the saved copy alone when Polar cannot answer, and keeps a guest order without an account", async () => {
    const { order: copy, polar } = await executeQuery(getOrderQuery({ orderId: REFUNDED_GUEST.id }))

    expect(copy.user).toBeNull()
    expect(copy.refunded).toStrictEqual({ amount: 499, currency: "USD" })
    expect(polar).toStrictEqual({ read: POLAR_READ.UNAVAILABLE })
  })

  it("answers not found for an order the copy does not have", async () => {
    await expect(executeQuery(getOrderQuery({ orderId: "ord_missing" }))).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })

  it("rejects a caller without the permission to read orders", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: BUYER_ID }))

    await expect(executeQuery(getOrderQuery({ orderId: PAID_CORE.id }))).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
