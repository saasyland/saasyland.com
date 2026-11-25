import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type PolarCatalogue, type PolarProduct, signedPolarWebhook } from "~/src/platform/testing/lib/polar"
import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import {
  grantPolarLicenseKey,
  payPolarCheckout,
  polarLicenseKeyOf,
  refundPolarOrder,
  revokePolarLicenseKey,
  seedPolarCatalogue,
} from "~/src/platform/testing/mocks/polar"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS, POLAR_WEBHOOK_EVENT } from "~/src/integrations/polar/polar.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { type Buyer, RETURN_PATH, actAs, startCheckout } from "~/src/modules/license/__test__/fixtures/checkout"
import { LICENSE_CHECKOUT_FIELD, LICENSE_TIER, LICENSE_WEBHOOK_EVENTS } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { upgradePriceQuery } from "~/src/modules/license/use-cases/get-upgrade-price"
import { currentOrdersQuery } from "~/src/modules/order/use-cases/get-current-orders"
import { startCheckoutMutation } from "~/src/modules/order/use-cases/start-checkout"

import { TIER_PRICES } from "~/src/data/license"

import * as ROUTES from "~/src/routes"

const WEBHOOKS_URL = new URL(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`, TEST_APP_URL)
const CONSENT = { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: true }

const STARTER_KIT: PolarProduct = {
  id: "00000000-0000-4000-8000-0000000000b1",
  name: "Starter kit",
  price: { amount: 4900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: null,
}

const STARTER_KIT_CATALOGUE = {
  licenseKeyBenefits: [{ activationLimit: 1, id: `${STARTER_KIT.id}-license-keys`, prefix: "STARTER", products: [STARTER_KIT] }],
  products: [STARTER_KIT],
} satisfies PolarCatalogue

const EVERY_EVENT_ACKNOWLEDGED = [HTTP_STATUS.OK, HTTP_STATUS.OK, HTTP_STATUS.OK, HTTP_STATUS.OK, HTTP_STATUS.OK]

const deliver = async (type: models.WebhookEventType, data: models.BenefitGrantWebhook | models.Order): Promise<number> => {
  const { body, headers } = signedPolarWebhook({ data, secret: env.POLAR_WEBHOOK_SECRET, type })
  const response = await auth.handler(new Request(WEBHOOKS_URL, { body, headers, method: "POST" }))
  return response.status
}

const buyLicense = async () => {
  const buyer = await signUpAndVerify()
  const checkout = await startCheckout(buyer, { tier: LICENSE_TIER.CORE })
  const order = payPolarCheckout(checkout.id, CONSENT)
  await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)
  const grant = grantPolarLicenseKey(order)
  await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, grant)
  return { buyer, grant }
}

const buyStarterKit = async (buyer: Buyer): Promise<models.Order> => {
  actAs(buyer)
  const { checkoutId } = await executeMutation(startCheckoutMutation, {
    locale: "en-US",
    productId: STARTER_KIT.id,
    returnPath: RETURN_PATH,
    successPath: ROUTES.APP_BILLING,
  })
  return payPolarCheckout(checkoutId)
}

const deliverEveryEventOf = async (paid: models.Order): Promise<number[]> => {
  const grant = grantPolarLicenseKey(paid)
  return [
    await deliver(POLAR_WEBHOOK_EVENT.ORDER_CREATED, paid),
    await deliver(POLAR_WEBHOOK_EVENT.ORDER_PAID, paid),
    await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, grant),
    await deliver(POLAR_WEBHOOK_EVENT.ORDER_REFUNDED, refundPolarOrder(paid.id, paid.net_amount)),
    await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked, revokePolarLicenseKey(grant)),
  ]
}

const licencesOf = (buyer: Buyer) => db.select().from(license).where(eq(license.userId, buyer.userId))

const copyOf = async (buyer: Buyer, orderId: string) => {
  actAs(buyer)
  const { orders } = await executeQuery(currentOrdersQuery)
  return orders.find(({ id }) => id === orderId)
}

beforeEach(() => {
  seedPolarCatalogue(STARTER_KIT_CATALOGUE)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("orders for other Polar products", () => {
  it("copies another product's order through its payment and refund, and leaves the buyer's licence, key, emails and upgrade price as they were", async () => {
    const { buyer, grant } = await buyLicense()
    const licences = await licencesOf(buyer)
    const licenseKey = polarLicenseKeyOf(grant)
    const emails = getSentEmails()
    const consoleError = vi.spyOn(console, "error")

    const paid = await buyStarterKit(buyer)

    expect(await deliverEveryEventOf(paid)).toStrictEqual(EVERY_EVENT_ACKNOWLEDGED)
    expect(await licencesOf(buyer)).toStrictEqual(licences)
    expect(polarLicenseKeyOf(grant)).toStrictEqual(licenseKey)
    expect(getSentEmails()).toStrictEqual(emails)
    expect(consoleError).not.toHaveBeenCalled()
    actAs(buyer)
    await expect(executeQuery(upgradePriceQuery({ tier: LICENSE_TIER.COMPLETE }))).resolves.toMatchObject({
      upgrade: { credit: TIER_PRICES[LICENSE_TIER.CORE] },
    })
    expect(await copyOf(buyer, paid.id)).toMatchObject({ checkoutId: paid.checkout_id, status: POLAR_ORDER_STATUS.REFUNDED })
  })

  it("grants no licence to an account without one that buys another product", async () => {
    const buyer = await signUpAndVerify()
    const emails = getSentEmails()
    const consoleError = vi.spyOn(console, "error")

    const paid = await buyStarterKit(buyer)

    expect(await deliverEveryEventOf(paid)).toStrictEqual(EVERY_EVENT_ACKNOWLEDGED)
    expect(await licencesOf(buyer)).toStrictEqual([])
    expect(getSentEmails()).toStrictEqual(emails)
    expect(consoleError).not.toHaveBeenCalled()
    expect(await copyOf(buyer, paid.id)).toMatchObject({ checkoutId: paid.checkout_id, status: POLAR_ORDER_STATUS.REFUNDED })
  })
})
