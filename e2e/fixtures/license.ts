import type { APIRequestContext, APIResponse } from "@playwright/test"
import * as zod from "zod"

import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { licensePolarProduct } from "../../src/modules/license/__test__/fixtures/polar-product"
import { LICENSE_CHECKOUT_FIELD, LICENSE_WEBHOOK_EVENTS, type LicenseTier } from "../../src/modules/license/license.constants"
import { polarCustomer, polarOrder, signedPolarWebhook } from "../../src/platform/testing/lib/polar"
import { ROUTES } from "../../src/routes"
import { TEST_POLAR, TEST_PRODUCT_IDS } from "../data/polar-settings"
import { expect } from "./test"

interface Purchase {
  readonly tier: LicenseTier
  readonly userId: string
}

interface PaidOrder extends Purchase {
  readonly productId?: string
  readonly withdrawalConsent?: boolean
}

interface GuestPurchase {
  readonly email: string
  readonly name: string
  readonly tier: LicenseTier
}

const checkoutsSchema = zod.array(
  zod.object({
    custom_field_data: zod.record(zod.string(), zod.unknown()),
    customer_email: zod.string(),
    discount_id: zod.string().nullable(),
    embed_origin: zod.string().nullable(),
    external_customer_id: zod.string(),
    id: zod.string(),
    locale: zod.string(),
    metadata: zod.record(zod.string(), zod.unknown()),
    product_id: zod.string(),
    return_url: zod.string(),
    total_amount: zod.int(),
  }),
)

const signedWebhookSchema = zod.object({ body: zod.string(), headers: zod.record(zod.string(), zod.string()) })

const paymentSchema = zod.object({ grantCreated: signedWebhookSchema, key: zod.string(), orderId: zod.string(), orderPaid: signedWebhookSchema })

const guestPaymentSchema = zod.object({ orderId: zod.string(), orderPaid: signedWebhookSchema })

const purchaseSchema = paymentSchema.extend({ orderRefunded: signedWebhookSchema })

export type SignedWebhook = zod.infer<typeof signedWebhookSchema>

export const deliverWebhook = async (request: APIRequestContext, { body, headers }: SignedWebhook): Promise<APIResponse> =>
  request.post(`${ROUTES.API.AUTH.BASE}${ROUTES.API.AUTH.POLAR.WEBHOOKS}`, { data: body, headers })

const post = async (request: APIRequestContext, webhook: SignedWebhook): Promise<void> => {
  expect((await deliverWebhook(request, webhook)).ok()).toBe(true)
}

const signedWebhookFrom = async (request: APIRequestContext, path: string, params: Record<string, string>): Promise<SignedWebhook> => {
  const response = await request.get(path, { params })
  expect(response.ok()).toBe(true)
  return signedWebhookSchema.parse(await response.json())
}

const consentFields = (withdrawalConsent: boolean) => ({ [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: withdrawalConsent })

export const signPaidOrder = (
  { productId, tier, userId, withdrawalConsent = false }: PaidOrder,
  secret: string = TEST_POLAR.POLAR_WEBHOOK_SECRET,
): SignedWebhook => {
  const paid = polarOrder({
    checkoutId: null,
    customer: polarCustomer(TEST_POLAR.POLAR_ORGANIZATION_ID, userId),
    metadata: {},
    product: licensePolarProduct(tier, productId ?? TEST_PRODUCT_IDS[tier]),
    status: POLAR_ORDER_STATUS.PAID,
  })
  const order = { ...paid, custom_field_data: consentFields(withdrawalConsent) }
  return signedPolarWebhook({ data: order, secret, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid })
}

export const deliverPaidOrder = async (request: APIRequestContext, order: PaidOrder): Promise<void> => {
  await post(request, signPaidOrder(order))
}

export const signedPurchase = async (request: APIRequestContext, { tier, userId }: Purchase) => {
  const response = await request.get("/__test/polar/purchase", { params: { customer: userId, tier } })
  expect(response.ok()).toBe(true)
  return purchaseSchema.parse(await response.json())
}

export const refundOrder = async (request: APIRequestContext, orderId: string, amount?: number): Promise<void> => {
  const params = amount === undefined ? { order: orderId } : { amount: String(amount), order: orderId }
  await post(request, await signedWebhookFrom(request, "/__test/polar/refund", params))
}

export const revokeLicenseKey = async (request: APIRequestContext, orderId: string): Promise<void> => {
  await post(request, await signedWebhookFrom(request, "/__test/polar/revoke", { order: orderId }))
}

export const cutOffPolar = async (request: APIRequestContext, key: string): Promise<void> => {
  const response = await request.get("/__test/polar/cut-off", { params: { key } })
  expect(response.ok()).toBe(true)
}

export const orderLicense = async (request: APIRequestContext, purchase: Purchase) => {
  const { grantCreated, key, orderId, orderPaid, orderRefunded } = await signedPurchase(request, purchase)

  await post(request, orderPaid)

  return {
    issueKey: async () => {
      await post(request, grantCreated)
    },
    key,
    orderId,
    redeliverPayment: async () => {
      await post(request, orderPaid)
    },
    refund: async () => {
      await post(request, orderRefunded)
    },
  }
}

export const buyLicense = async (request: APIRequestContext, purchase: Purchase) => {
  const { issueKey, key, orderId, refund } = await orderLicense(request, purchase)
  await issueKey()

  return { key, orderId, refund }
}

export const deliverGuestOrder = async (request: APIRequestContext, { email, name, tier }: GuestPurchase): Promise<string> => {
  const response = await request.get("/__test/polar/guest-purchase", { params: { email, name, tier } })
  expect(response.ok()).toBe(true)
  const { orderId, orderPaid } = guestPaymentSchema.parse(await response.json())
  await post(request, orderPaid)
  return orderId
}

export const startedCheckouts = async (request: APIRequestContext, customer: string) => {
  const response = await request.get("/__test/polar/checkouts", { params: { customer } })
  expect(response.ok()).toBe(true)
  return checkoutsSchema.parse(await response.json())
}

export const payCheckout = async (request: APIRequestContext, checkout: string) => {
  const response = await request.get("/__test/polar/pay", { params: { checkout } })
  expect(response.ok()).toBe(true)
  const { grantCreated, key, orderId, orderPaid } = paymentSchema.parse(await response.json())

  await post(request, orderPaid)
  await post(request, grantCreated)

  return { key, orderId }
}
