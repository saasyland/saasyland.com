import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import { POLAR_ORDER_STATUS, POLAR_SUBSCRIPTION_STATUS, POLAR_WEBHOOK_EVENT } from "../../src/integrations/polar/polar.constants"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { TEST_BILLING_PRODUCTS } from "./billing"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

const CONFIRMED_AFTER_MS = 1000

const PRODUCTS = Object.values(TEST_BILLING_PRODUCTS)

const RECURRING_PRODUCTS = [TEST_BILLING_PRODUCTS.PLAN]

const purchaseSchema = zod.object({
  checkout: zod.uuid().optional(),
  customer: zod.string().min(1),
  product: zod.enum(PRODUCTS.map(({ id }) => id)),
})

const paidLater = (order: models.Order): models.Order => ({
  ...order,
  modified_at: new Date(Date.parse(order.created_at) + CONFIRMED_AFTER_MS).toISOString(),
  status: POLAR_ORDER_STATUS.PAID,
})

const cancelledLater = (subscription: models.Subscription): models.Subscription => {
  const cancelledAt = new Date(Date.parse(subscription.created_at) + CONFIRMED_AFTER_MS).toISOString()

  return { ...subscription, cancel_at_period_end: true, canceled_at: cancelledAt, modified_at: cancelledAt }
}

export const BILLING_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.SETUP,
    setup: async () => {
      const polar = await import("../../src/platform/testing/mocks/polar")
      polar.seedPolarCatalogue({ licenseKeyBenefits: [], products: PRODUCTS })
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/polar/billing-purchase",
    respond: async (url, env) => {
      const purchase = purchaseSchema.safeParse(Object.fromEntries(url.searchParams))
      if (!purchase.success) {
        return Response.json({ error: "A customer external ID and a billing test product are required" }, { status: HTTP_STATUS.BAD_REQUEST })
      }
      const { checkout = null, customer, product: productId } = purchase.data
      const { createPolarOrder } = await import("../../src/platform/testing/mocks/polar")
      const { polarCustomer, polarSubscription, signedPolarWebhook } = await import("../../src/platform/testing/lib/polar")
      const placed = createPolarOrder(
        { externalCustomerId: customer, productId },
        { checkout_id: checkout, invoice_number: `TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, is_invoice_generated: true },
      )
      const secret = env.POLAR_WEBHOOK_SECRET
      const subscriptions = RECURRING_PRODUCTS.filter(({ id }) => id === productId).map((product) =>
        polarSubscription({
          customer: { ...polarCustomer(env.POLAR_ORGANIZATION_ID, customer), id: placed.customer_id },
          product,
          status: POLAR_SUBSCRIPTION_STATUS.ACTIVE,
        }),
      )
      return Response.json({
        invoiceNumber: placed.invoice_number,
        orderCreated: signedPolarWebhook({ data: { ...placed, status: POLAR_ORDER_STATUS.PENDING }, secret, type: POLAR_WEBHOOK_EVENT.ORDER_CREATED }),
        orderId: placed.id,
        orderUpdated: signedPolarWebhook({ data: paidLater(placed), secret, type: POLAR_WEBHOOK_EVENT.ORDER_UPDATED }),
        subscriptionsCreated: subscriptions.map((data) => signedPolarWebhook({ data, secret, type: POLAR_WEBHOOK_EVENT.SUBSCRIPTION_CREATED })),
        subscriptionsUpdated: subscriptions.map((data) =>
          signedPolarWebhook({ data: cancelledLater(data), secret, type: POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED }),
        ),
      })
    },
  },
] as const satisfies readonly TestWorkerEntry[]
