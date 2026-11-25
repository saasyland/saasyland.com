import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { LICENSE_CHECKOUT_FIELD, LICENSE_TIERS, LICENSE_WEBHOOK_EVENTS } from "../../src/modules/license/license.constants"
import { TEST_LICENSES, TEST_MACHINES_LICENSE } from "./licenses"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

const purchaseSchema = zod.object({ customer: zod.string().min(1), tier: zod.enum(LICENSE_TIERS) })

const guestPurchaseSchema = zod.object({ email: zod.email(), name: zod.string().min(1), tier: zod.enum(LICENSE_TIERS) })

const refundSchema = zod.object({ amount: zod.coerce.number().int().positive().optional(), order: zod.string().min(1) })

const orderSchema = zod.object({ order: zod.string().min(1) })

const keySchema = zod.object({ key: zod.string().min(1) })

const invalid = (error: string): Response => Response.json({ error }, { status: HTTP_STATUS.BAD_REQUEST })

const paidOrderWebhooks = async (order: models.Order, secret: string) => {
  const polar = await import("../../src/platform/testing/mocks/polar")
  const { signedPolarWebhook } = await import("../../src/platform/testing/lib/polar")

  const grant = polar.grantPolarLicenseKey(order)

  return {
    grantCreated: signedPolarWebhook({ data: grant, secret, type: LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated }),
    key: polar.polarLicenseKeyOf(grant).key,
    orderId: order.id,
    orderPaid: signedPolarWebhook({ data: order, secret, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid }),
  }
}

export const LICENSE_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.SETUP,
    setup: async () => {
      const polar = await import("../../src/platform/testing/mocks/polar")
      const { POLAR_PRODUCT_IDS } = await import("../../src/modules/license/license.utils")
      for (const { activation, key, polarLicenseKeyId, tier, user } of TEST_LICENSES) {
        polar.seedPolarLicenseKey({
          activations: [activation],
          externalCustomerId: user.id,
          key,
          licenseKeyId: polarLicenseKeyId,
          productId: POLAR_PRODUCT_IDS[tier],
        })
      }
      const { activations, key, polarLicenseKeyId, tier, user } = TEST_MACHINES_LICENSE
      polar.seedPolarLicenseKey({
        activations: activations.map(({ platform, ...activation }) => ({ ...activation, meta: { platform } })),
        externalCustomerId: user.id,
        key,
        licenseKeyId: polarLicenseKeyId,
        productId: POLAR_PRODUCT_IDS[tier],
      })
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/polar/checkouts",
    respond: async (url) => {
      const customer = url.searchParams.get("customer")
      if (customer === null || customer.length === 0) {
        return Response.json({ error: "A customer external ID is required" }, { status: HTTP_STATUS.BAD_REQUEST })
      }
      const { polarCheckouts } = await import("../../src/platform/testing/mocks/polar")
      return Response.json(polarCheckouts().filter(({ external_customer_id: externalId }) => externalId === customer))
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/polar/checkout",
    respond: async (url) => {
      const { polarCheckouts } = await import("../../src/platform/testing/mocks/polar")
      const checkout = polarCheckouts().find(({ client_secret: secret }) => secret === url.searchParams.get("secret"))
      if (checkout === undefined) {
        return Response.json({ error: "No checkout has that client secret" }, { status: HTTP_STATUS.NOT_FOUND })
      }
      return Response.json(checkout)
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/polar/purchase",
    respond: async (url, env) => {
      const purchase = purchaseSchema.safeParse(Object.fromEntries(url.searchParams))
      if (!purchase.success) {
        return Response.json({ error: "A customer external ID and a licence tier are required" }, { status: HTTP_STATUS.BAD_REQUEST })
      }
      const { createPolarOrder } = await import("../../src/platform/testing/mocks/polar")
      const { signedPolarWebhook } = await import("../../src/platform/testing/lib/polar")
      const { POLAR_PRODUCT_IDS } = await import("../../src/modules/license/license.utils")
      const order = createPolarOrder(
        { externalCustomerId: purchase.data.customer, productId: POLAR_PRODUCT_IDS[purchase.data.tier] },
        { custom_field_data: { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: true } },
      )
      const secret = env.POLAR_WEBHOOK_SECRET
      return Response.json({
        ...(await paidOrderWebhooks(order, secret)),
        orderRefunded: signedPolarWebhook({
          data: { ...order, refundable_amount: 0, refunded_amount: order.net_amount, status: POLAR_ORDER_STATUS.REFUNDED },
          secret,
          type: LICENSE_WEBHOOK_EVENTS.onOrderRefunded,
        }),
      })
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/polar/pay",
    respond: async (url, env) => {
      const checkoutId = url.searchParams.get("checkout")
      if (checkoutId === null || checkoutId.length === 0) {
        return Response.json({ error: "A checkout ID is required" }, { status: HTTP_STATUS.BAD_REQUEST })
      }
      const { payPolarCheckout } = await import("../../src/platform/testing/mocks/polar")
      const order = payPolarCheckout(checkoutId, { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: true })
      return Response.json(await paidOrderWebhooks(order, env.POLAR_WEBHOOK_SECRET))
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/polar/guest-purchase",
    respond: async (url, env) => {
      const purchase = guestPurchaseSchema.safeParse(Object.fromEntries(url.searchParams))
      if (!purchase.success) {
        return invalid("An email address, a name and a licence tier are required")
      }
      const { createGuestPolarOrder } = await import("../../src/platform/testing/mocks/polar")
      const { signedPolarWebhook } = await import("../../src/platform/testing/lib/polar")
      const { POLAR_PRODUCT_IDS } = await import("../../src/modules/license/license.utils")
      const { email, name, tier } = purchase.data
      const order = createGuestPolarOrder({ email, name, productId: POLAR_PRODUCT_IDS[tier] })
      return Response.json({
        orderId: order.id,
        orderPaid: signedPolarWebhook({ data: order, secret: env.POLAR_WEBHOOK_SECRET, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid }),
      })
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/polar/refund",
    respond: async (url, env) => {
      const refund = refundSchema.safeParse(Object.fromEntries(url.searchParams))
      if (!refund.success) {
        return invalid("An order ID is required, and an amount is a positive number of minor units")
      }
      const { polarOrderOf, refundPolarOrder } = await import("../../src/platform/testing/mocks/polar")
      const { signedPolarWebhook } = await import("../../src/platform/testing/lib/polar")
      const { amount, order: orderId } = refund.data
      const order = polarOrderOf(orderId)
      const refunded = refundPolarOrder(orderId, amount ?? order.refundable_amount)
      return Response.json(signedPolarWebhook({ data: refunded, secret: env.POLAR_WEBHOOK_SECRET, type: LICENSE_WEBHOOK_EVENTS.onOrderRefunded }))
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/polar/revoke",
    respond: async (url, env) => {
      const revocation = orderSchema.safeParse(Object.fromEntries(url.searchParams))
      if (!revocation.success) {
        return invalid("An order ID is required")
      }
      const { polarLicenseKeyGrantOf, revokePolarLicenseKey } = await import("../../src/platform/testing/mocks/polar")
      const { signedPolarWebhook } = await import("../../src/platform/testing/lib/polar")
      const revoked = revokePolarLicenseKey(polarLicenseKeyGrantOf(revocation.data.order))
      return Response.json(signedPolarWebhook({ data: revoked, secret: env.POLAR_WEBHOOK_SECRET, type: LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked }))
    },
  },
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/polar/cut-off",
    respond: async (url) => {
      const cutOff = keySchema.safeParse(Object.fromEntries(url.searchParams))
      if (!cutOff.success) {
        return invalid("A licence key is required")
      }
      const { cutOffPolarLicenseKey } = await import("../../src/platform/testing/mocks/polar")
      cutOffPolarLicenseKey(cutOff.data.key)
      return new Response(undefined, { status: HTTP_STATUS.NO_CONTENT })
    },
  },
] as const satisfies readonly TestWorkerEntry[]
