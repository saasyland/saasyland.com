import type { APIRequestContext } from "@playwright/test"
import * as zod from "zod"

import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { licensePolarProduct } from "../../src/modules/license/__test__/fixtures/polar-product"
import { LICENSE_CHECKOUT_FIELD, LICENSE_WEBHOOK_EVENTS, type LicenseTier } from "../../src/modules/license/license.constants"
import { polarCustomer, polarOrder, signedPolarWebhook } from "../../src/platform/testing/lib/polar"
import { ROUTES } from "../../src/routes"
import { TEST_POLAR, TEST_PRODUCT_IDS } from "../data/polar-settings"
import { expect } from "./test"

interface PaidOrder {
  readonly tier: LicenseTier
  readonly userId: string
  readonly withdrawalConsent?: boolean
}

const checkoutsSchema = zod.array(
  zod.object({
    custom_field_data: zod.record(zod.string(), zod.unknown()),
    embed_origin: zod.string().nullable(),
    locale: zod.string(),
    metadata: zod.record(zod.string(), zod.unknown()),
    product_id: zod.string(),
    return_url: zod.string(),
    id: zod.string(),
    total_amount: zod.int(),
  }),
)

const signedWebhookSchema = zod.object({ body: zod.string(), headers: zod.record(zod.string(), zod.string()) })

const purchaseSchema = zod.object({ grantCreated: signedWebhookSchema, orderPaid: signedWebhookSchema, orderRefunded: signedWebhookSchema })

type SignedWebhook = zod.infer<typeof signedWebhookSchema>

const post = async (request: APIRequestContext, { body, headers }: SignedWebhook): Promise<void> => {
  const response = await request.post(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`, { data: body, headers })
  expect(response.ok()).toBe(true)
}

const consentFields = (withdrawalConsent: boolean) => ({ [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: withdrawalConsent })

export const deliverPaidOrder = async (request: APIRequestContext, { tier, userId, withdrawalConsent = false }: PaidOrder) => {
  const paid = polarOrder({
    checkoutId: null,
    customer: polarCustomer(TEST_POLAR.POLAR_ORGANIZATION_ID, userId),
    metadata: {},
    product: licensePolarProduct(tier, TEST_PRODUCT_IDS[tier]),
    status: POLAR_ORDER_STATUS.PAID,
  })
  const order = { ...paid, custom_field_data: consentFields(withdrawalConsent) }
  await post(request, signedPolarWebhook({ data: order, secret: TEST_POLAR.POLAR_WEBHOOK_SECRET, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid }))
}

export const buyLicense = async (request: APIRequestContext, { tier, userId }: Omit<PaidOrder, "withdrawalConsent">) => {
  const response = await request.get("/__test/polar/purchase", { params: { customer: userId, tier } })
  expect(response.ok()).toBe(true)
  const { grantCreated, orderPaid, orderRefunded } = purchaseSchema.parse(await response.json())

  await post(request, orderPaid)
  await post(request, grantCreated)

  return {
    refund: async () => {
      await post(request, orderRefunded)
    },
  }
}

export const startedCheckouts = async (request: APIRequestContext, customer: string) => {
  const response = await request.get("/__test/polar/checkouts", { params: { customer } })
  expect(response.ok()).toBe(true)
  return checkoutsSchema.parse(await response.json())
}

const paymentSchema = zod.object({ grantCreated: signedWebhookSchema, orderPaid: signedWebhookSchema })

export const payCheckout = async (request: APIRequestContext, checkout: string): Promise<void> => {
  const response = await request.get("/__test/polar/pay", { params: { checkout } })
  expect(response.ok()).toBe(true)
  const { grantCreated, orderPaid } = paymentSchema.parse(await response.json())

  await post(request, orderPaid)
  await post(request, grantCreated)
}
