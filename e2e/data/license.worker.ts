import * as zod from "zod"

import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { LICENSE_CHECKOUT_FIELD, LICENSE_TIERS, LICENSE_WEBHOOK_EVENTS } from "../../src/modules/license/license.constants"
import { TEST_LICENSES } from "./licenses"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

const purchaseSchema = zod.object({ customer: zod.string().min(1), tier: zod.enum(LICENSE_TIERS) })

export const LICENSE_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.SETUP,
    setup: async () => {
      const polar = await import("../../src/platform/testing/mocks/polar")
      const { POLAR_PRODUCT_IDS } = await import("../../src/modules/license/license.utils")
      for (const { activation, key, polarLicenseKeyId, tier, user } of TEST_LICENSES) {
        polar.seedPolarLicenseKey({
          activation,
          externalCustomerId: user.id,
          key,
          licenseKeyId: polarLicenseKeyId,
          productId: POLAR_PRODUCT_IDS[tier],
        })
      }
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
      const polar = await import("../../src/platform/testing/mocks/polar")
      const { signedPolarWebhook } = await import("../../src/platform/testing/lib/polar")
      const { POLAR_PRODUCT_IDS } = await import("../../src/modules/license/license.utils")
      const order = polar.createPolarOrder(
        { externalCustomerId: purchase.data.customer, productId: POLAR_PRODUCT_IDS[purchase.data.tier] },
        { custom_field_data: { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: true } },
      )
      const grant = polar.grantPolarLicenseKey(order)
      const secret = env.POLAR_WEBHOOK_SECRET
      return Response.json({
        grantCreated: signedPolarWebhook({ data: grant, secret, type: LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated }),
        orderPaid: signedPolarWebhook({ data: order, secret, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid }),
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
      const polar = await import("../../src/platform/testing/mocks/polar")
      const { signedPolarWebhook } = await import("../../src/platform/testing/lib/polar")
      const order = polar.payPolarCheckout(checkoutId, { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: true })
      const secret = env.POLAR_WEBHOOK_SECRET
      return Response.json({
        grantCreated: signedPolarWebhook({ data: polar.grantPolarLicenseKey(order), secret, type: LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated }),
        orderPaid: signedPolarWebhook({ data: order, secret, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid }),
      })
    },
  },
] as const satisfies readonly TestWorkerEntry[]
