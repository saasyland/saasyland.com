import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { PolarProduct } from "~/src/platform/testing/lib/polar"
import { executeQuery } from "~/src/platform/testing/lib/query"
import { createPolarOrder, polarInvoiceUrl, seedPolarCatalogue } from "~/src/platform/testing/mocks/polar"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import {
  ADMIN_ID,
  BUYER_ID,
  ORDERS,
  ORDER_USERS,
  PAID_CORE,
  PENDING_CORE,
  REFUNDED_GUEST,
} from "~/src/modules/order/__test__/fixtures/order-buyers"
import { ORDER_INVOICE_STATUS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { currentOrderInvoiceQuery } from "~/src/modules/order/use-cases/get-current-order-invoice"
import { user } from "~/src/modules/user/user.schema"

const STARTER_KIT: PolarProduct = {
  id: "00000000-0000-4000-8000-0000000000a1",
  name: "Starter kit",
  price: { amount: 4900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: null,
}

const signInAs = (userId: string, role: string = ROLE_CODES.CUSTOMER): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId }))
}

const placeInPolar = (orderId: string, isInvoiceGenerated: boolean): void => {
  createPolarOrder({ externalCustomerId: BUYER_ID, productId: STARTER_KIT.id }, { id: orderId, is_invoice_generated: isInvoiceGenerated })
}

beforeEach(async () => {
  seedPolarCatalogue({ licenseKeyBenefits: [], products: [STARTER_KIT] })
  await db.delete(order)
  await db.delete(user)
  await db.insert(user).values(ORDER_USERS)
  await db.insert(order).values(ORDERS)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-current-order-invoice", () => {
  it("hands the buyer the invoice Polar has issued for their own order", async () => {
    signInAs(BUYER_ID)
    placeInPolar(PAID_CORE.id, true)

    await expect(executeQuery(currentOrderInvoiceQuery({ orderId: PAID_CORE.id }))).resolves.toStrictEqual({
      status: ORDER_INVOICE_STATUS.ISSUED,
      url: polarInvoiceUrl(PAID_CORE.id),
    })
  })

  it("says so while Polar has not issued the invoice yet", async () => {
    signInAs(BUYER_ID)
    placeInPolar(PAID_CORE.id, false)

    await expect(executeQuery(currentOrderInvoiceQuery({ orderId: PAID_CORE.id }))).resolves.toStrictEqual({
      status: ORDER_INVOICE_STATUS.PENDING,
    })
  })

  it.each([
    ["another account's order", PENDING_CORE.id],
    ["an order of a customer without an account", REFUNDED_GUEST.id],
    ["an order the copies do not hold", "ord_unknown"],
  ])("answers not found for %s, without asking Polar", async (_case, orderId) => {
    signInAs(BUYER_ID)
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    await expect(executeQuery(currentOrderInvoiceQuery({ orderId }))).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("does not open a customer's invoice to an administrator, who reads orders in the admin console", async () => {
    signInAs(ADMIN_ID, ROLE_CODES.ADMIN)

    await expect(executeQuery(currentOrderInvoiceQuery({ orderId: PAID_CORE.id }))).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })

  it("refuses a visitor who is not signed in", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(null)

    await expect(executeQuery(currentOrderInvoiceQuery({ orderId: PAID_CORE.id }))).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
    })
  })

  it("refuses an empty order ID", () => {
    expect(orderZodSchemas.getCurrentOrderInvoice.safeParse({ orderId: "" }).success).toBe(false)
  })
})
