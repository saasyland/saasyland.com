import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { type PolarProduct, polarCustomer, polarOrder, polarOrderDiscount } from "~/src/platform/testing/lib/polar"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { order } from "~/src/modules/order/order.schema"
import { recordOrder } from "~/src/modules/order/use-cases/record-order"
import { user } from "~/src/modules/user/user.schema"

const PRODUCT = {
  id: "product-recorded",
  name: "Recorded product",
  price: { amount: 4900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: JSON_NULL,
} as const satisfies PolarProduct

const DISCOUNT = { basisPoints: 1000, code: "RECORDED10", name: "Recorded discount" } as const

const PLACED_AT = "2026-11-16T10:00:00.000Z"
const PAID_AT = "2026-11-16T10:00:05.000Z"
const REFUNDED_AT = "2026-11-17T09:00:00.000Z"

const createAccount = async (): Promise<string> => {
  const id = crypto.randomUUID()
  await db.insert(user).values({ email: `${id}@example.test`, id, name: "Buyer" })
  return id
}

const placedOrder = (externalId: string | null): models.Order => {
  const placed = polarOrder({
    checkoutId: JSON_NULL,
    customer: { ...polarCustomer(env.POLAR_ORGANIZATION_ID, "buyer"), external_id: externalId },
    metadata: {},
    product: PRODUCT,
    status: POLAR_ORDER_STATUS.PENDING,
  })
  return { ...placed, created_at: PLACED_AT }
}

const paid = (placed: models.Order): models.Order => ({ ...placed, modified_at: PAID_AT, status: POLAR_ORDER_STATUS.PAID })

const refunded = (placed: models.Order): models.Order => ({
  ...placed,
  modified_at: REFUNDED_AT,
  refundable_amount: 0,
  refunded_amount: placed.total_amount,
  status: POLAR_ORDER_STATUS.REFUNDED,
})

const storedOrder = async (id: string) => {
  const [row] = await db.select().from(order).where(eq(order.id, id))
  return row
}

describe("recording a Polar order", () => {
  it("copies a new order under Polar's ID with Polar's fields, linked to the buyer's account, at the version of its creation", async () => {
    const buyer = await createAccount()
    const placed = { ...placedOrder(buyer), invoice_number: "SAASY-0001", subscription_id: "subscription-recorded" }

    await recordOrder(placed)

    const stored = await storedOrder(placed.id)
    expect(stored).toStrictEqual({
      billingCountry: JSON_NULL,
      changedAt: new Date(PLACED_AT),
      createdAt: stored?.createdAt,
      currency: DEFAULT_CURRENCY_CODE.toLowerCase(),
      customerId: placed.customer_id,
      description: PRODUCT.name,
      discountAmount: 0,
      discountCode: JSON_NULL,
      discountId: JSON_NULL,
      discountName: JSON_NULL,
      id: placed.id,
      invoiceNumber: "SAASY-0001",
      placedAt: new Date(PLACED_AT),
      productId: PRODUCT.id,
      refundedAmount: 0,
      status: POLAR_ORDER_STATUS.PENDING,
      subscriptionId: "subscription-recorded",
      totalAmount: PRODUCT.price.amount,
      updatedAt: stored?.updatedAt,
      userId: buyer,
    })
  })

  it("copies the discount and billing country Polar applied to the order", async () => {
    const discount = polarOrderDiscount({ ...DISCOUNT, organizationId: env.POLAR_ORGANIZATION_ID })
    const placed: models.Order = {
      ...placedOrder(await createAccount()),
      billing_address: { country: "PL" },
      discount,
      discount_amount: 490,
      discount_id: discount.id,
    }

    await recordOrder(placed)

    expect(await storedOrder(placed.id)).toMatchObject({
      billingCountry: "PL",
      discountAmount: 490,
      discountCode: DISCOUNT.code,
      discountId: discount.id,
      discountName: DISCOUNT.name,
    })
  })

  it("keeps a discount without a code, and the copied terms when a later version omits the address", async () => {
    const discount = polarOrderDiscount({ ...DISCOUNT, code: JSON_NULL, organizationId: env.POLAR_ORGANIZATION_ID })
    const placed: models.Order = {
      ...placedOrder(await createAccount()),
      billing_address: { country: "PL" },
      discount,
      discount_id: discount.id,
    }

    await recordOrder(placed)
    await recordOrder({ ...paid(placed), billing_address: JSON_NULL })

    expect(await storedOrder(placed.id)).toMatchObject({
      billingCountry: "PL",
      discountCode: JSON_NULL,
      discountName: DISCOUNT.name,
      status: POLAR_ORDER_STATUS.PAID,
    })
  })

  it("applies each newer version of the order, such as its payment and then its refund", async () => {
    const placed = placedOrder(await createAccount())

    await recordOrder(placed)
    await recordOrder(paid(placed))
    expect(await storedOrder(placed.id)).toMatchObject({ changedAt: new Date(PAID_AT), status: POLAR_ORDER_STATUS.PAID })

    await recordOrder(refunded(placed))
    expect(await storedOrder(placed.id)).toMatchObject({
      changedAt: new Date(REFUNDED_AT),
      placedAt: new Date(PLACED_AT),
      refundedAmount: placed.total_amount,
      status: POLAR_ORDER_STATUS.REFUNDED,
    })
  })

  it("ignores older versions that arrive after a newer one", async () => {
    const placed = placedOrder(await createAccount())
    await recordOrder(refunded(placed))
    const recorded = await storedOrder(placed.id)

    await recordOrder(paid(placed))
    await recordOrder(placed)

    expect(await storedOrder(placed.id)).toStrictEqual(recorded)
  })

  it("writes the same version again with identical values when Polar delivers it twice", async () => {
    const paidOrder = paid(placedOrder(await createAccount()))
    await recordOrder(paidOrder)
    const recorded = await storedOrder(paidOrder.id)

    await recordOrder(paidOrder)

    const rewritten = await storedOrder(paidOrder.id)
    expect(rewritten).toStrictEqual({ ...recorded, updatedAt: rewritten?.updatedAt })
  })

  it("keeps the state written last when two states carry the same version", async () => {
    const placed = placedOrder(await createAccount())

    await recordOrder(paid(placed))
    await recordOrder({ ...paid(placed), status: POLAR_ORDER_STATUS.VOID })

    expect(await storedOrder(placed.id)).toMatchObject({ changedAt: new Date(PAID_AT), status: POLAR_ORDER_STATUS.VOID })
  })
})

describe("the account of a recorded order", () => {
  it.each([
    ["names no account", crypto.randomUUID()],
    ["is missing", JSON_NULL],
  ])("stays empty when the customer's external ID %s", async (_case, externalId) => {
    const placed = placedOrder(externalId)

    await recordOrder(placed)

    expect(await storedOrder(placed.id)).toMatchObject({ id: placed.id, userId: JSON_NULL })
  })

  it("stays empty when the account was deleted before the order arrived", async () => {
    const deleted = await createAccount()
    await db.delete(user).where(eq(user.id, deleted))
    const placed = placedOrder(deleted)

    await recordOrder(placed)

    expect(await storedOrder(placed.id)).toMatchObject({ id: placed.id, userId: JSON_NULL })
  })

  it("empties when the account is deleted and stays empty for later versions of the order", async () => {
    const buyer = await createAccount()
    const placed = placedOrder(buyer)
    await recordOrder(placed)

    await db.delete(user).where(eq(user.id, buyer))
    expect(await storedOrder(placed.id)).toMatchObject({ userId: JSON_NULL })

    await recordOrder(paid(placed))
    expect(await storedOrder(placed.id)).toMatchObject({ status: POLAR_ORDER_STATUS.PAID, userId: JSON_NULL })
  })
})
