import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { signedPolarWebhook } from "~/src/platform/testing/lib/polar"
import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import {
  POLAR_DISCOUNTS,
  activatePolarLicenseKey,
  createPolarOrder,
  grantPolarLicenseKey,
  payPolarCheckout,
  polarCheckouts,
  polarLicenseKeyOf,
  refundPolarOrder,
  revokePolarLicenseKey,
} from "~/src/platform/testing/mocks/polar"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import { browserHeaders, signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_CHECKOUT_ID_PLACEHOLDER, POLAR_PRODUCT_IDS } from "~/src/integrations/polar/polar.constants"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COUNTRY_HEADER, HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { toMinorUnits } from "~/src/modules/_core/constants/currency"
import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DEFAULT_CURRENCY_CODE, PPP_COOKIE, PPP_DECLINED, PPP_PERCENT, pppMultiplierKey } from "~/src/modules/_core/constants/pricing"
import {
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_STATUS,
  LICENSE_TIER,
  LICENSE_WEBHOOK_EVENTS,
  type LicenseTier,
} from "~/src/modules/license/license.constants"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import { deactivateLicenseMutation } from "~/src/modules/license/use-cases/deactivate-license"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { licenseActivationsQuery } from "~/src/modules/license/use-cases/get-current-license-activations"
import { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"
import { user } from "~/src/modules/user/user.schema"

import { TIER_PRICES } from "~/src/data/marketing"

import { ROUTES } from "~/src/routes"

const STALE_SIGNATURE_MS = 600_000
const WEBHOOKS_URL = new URL(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.POLAR_WEBHOOKS}`, TEST_APP_URL)

interface Buyer {
  readonly headers: Headers
  readonly userId: string
}

interface BrowserState {
  readonly cookie?: string
  readonly country?: string
}

const actAs = ({ headers }: Buyer, { cookie, country = "US" }: BrowserState = {}): void => {
  const requestHeaders = new Headers(headers)
  requestHeaders.set(COUNTRY_HEADER, country)
  if (cookie !== undefined) {
    requestHeaders.set("cookie", `${requestHeaders.get("cookie") ?? ""}; ${cookie}`)
  }
  vi.mocked(getRequest).mockReturnValue(new Request(`${TEST_APP_URL}/_serverFn/license`, { headers: requestHeaders, method: "POST" }))
}

const startCheckout = async (
  buyer: Buyer,
  { locale = "en-US", tier, ...browser }: BrowserState & { readonly locale?: SupportedLocale; readonly tier: LicenseTier },
): Promise<models.Checkout> => {
  actAs(buyer, browser)
  const { url } = await executeMutation(startCheckoutMutation, { locale, tier })
  const checkout = polarCheckouts().find(({ id }) => new URL(url).searchParams.get("checkoutId") === id)
  if (checkout === undefined) {
    throw new Error(`Polar holds no checkout for ${url}`)
  }
  return checkout
}

const postWebhook = async (body: string, headers: Record<string, string>): Promise<number> => {
  const response = await auth.handler(new Request(WEBHOOKS_URL, { body, headers, method: "POST" }))
  return response.status
}

const deliver = (
  type: models.WebhookEventType,
  data: models.BenefitGrantWebhook | models.Order,
  signing: { secret?: string; sentAt?: Date } = {},
): Promise<number> => {
  const { body, headers } = signedPolarWebhook({ data, secret: env.POLAR_WEBHOOK_SECRET, type, ...signing })
  return postWebhook(body, headers)
}

const paidOrder = async (buyer: Buyer, tier: LicenseTier = LICENSE_TIER.CORE): Promise<models.Order> => {
  const checkout = await startCheckout(buyer, { tier })
  return payPolarCheckout(checkout.id)
}

const currentLicense = async (buyer: Buyer) => {
  actAs(buyer)
  const { license } = await executeQuery(currentLicenseQuery)
  return license
}

const listPrice = (tier: LicenseTier): number => toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE)

const regionalPrice = (tier: LicenseTier, country: string): number =>
  toMinorUnits((TIER_PRICES[tier] * pppMultiplierKey(country)) / PPP_PERCENT, DEFAULT_CURRENCY_CODE)

const buyLicense = async (tier: LicenseTier = LICENSE_TIER.CORE) => {
  const buyer = await signUpAndVerify()
  const order = await paidOrder(buyer, tier)
  await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)
  const grant = grantPolarLicenseKey(order)
  await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, grant)
  return { buyer, grant, order }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("checkout", () => {
  it("opens a Polar checkout for the chosen tier at full price, tied to the account, that returns to the app in the buyer's language", async () => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { locale: "pl-PL", tier: LICENSE_TIER.COMPLETE })

    expect(checkout).toMatchObject({
      allow_discount_codes: false,
      discount_id: null,
      external_customer_id: buyer.userId,
      metadata: {},
      net_amount: listPrice(LICENSE_TIER.COMPLETE),
      product_id: POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE],
      success_url: `${TEST_APP_URL}/pl-PL${ROUTES.APP}?checkoutId=${POLAR_CHECKOUT_ID_PLACEHOLDER}`,
    })
  })

  it.each(["PT", "PL", "IN", "UA"])("charges a buyer from %s the regional price the pricing cards show", async (country) => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { country, tier: LICENSE_TIER.AGENCY })

    expect(POLAR_DISCOUNTS.map(({ id }) => id)).toContain(checkout.discount_id)
    expect(checkout.net_amount).toBe(regionalPrice(LICENSE_TIER.AGENCY, country))
  })

  it("charges the full price when the buyer turned regional pricing off", async () => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { cookie: `${PPP_COOKIE}=${PPP_DECLINED}`, country: "PL", tier: LICENSE_TIER.CORE })

    expect(checkout).toMatchObject({ discount_id: null, net_amount: listPrice(LICENSE_TIER.CORE) })
  })

  it("passes the affiliate referral to Polar, which keeps it on the paid order", async () => {
    const buyer = await signUpAndVerify()
    const referral = "cmh7q6ayf0001jz08referral"

    const checkout = await startCheckout(buyer, { cookie: `${AFFONSO.REFERRAL_COOKIE}=${referral}`, tier: LICENSE_TIER.CORE })

    expect(checkout.metadata).toStrictEqual({ [AFFONSO.METADATA_KEY]: referral })
    expect(payPolarCheckout(checkout.id).metadata).toStrictEqual({ [AFFONSO.METADATA_KEY]: referral })
  })

  it("refuses a second checkout while the account holds an active licence, without asking Polar", async () => {
    const { buyer } = await buyLicense()
    const checkoutsBefore = polarCheckouts().length

    await expect(startCheckout(buyer, { tier: LICENSE_TIER.AGENCY })).rejects.toThrow(ERROR_CODES.LICENSE_ALREADY_ACTIVE)

    expect(polarCheckouts()).toHaveLength(checkoutsBefore)
  })

  it("lets an account whose licence was refunded buy again", async () => {
    const { buyer, order } = await buyLicense()
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, order.net_amount))

    const checkout = await startCheckout(buyer, { tier: LICENSE_TIER.COMPLETE })

    expect(checkout.product_id).toBe(POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE])
  })

  it("refuses a tier this app does not sell and a language it does not speak", () => {
    expect(licenseZodSchemas.startCheckout.safeParse({ locale: "en-US", tier: "enterprise" }).success).toBe(false)
    expect(licenseZodSchemas.startCheckout.safeParse({ locale: "xx-XX", tier: LICENSE_TIER.CORE }).success).toBe(false)
  })

  it("refuses a visitor who is not signed in", async () => {
    vi.mocked(getRequest).mockReturnValue(new Request(`${TEST_APP_URL}/_serverFn/license`, { headers: browserHeaders(), method: "POST" }))

    await expect(executeMutation(startCheckoutMutation, { locale: "en-US", tier: LICENSE_TIER.CORE })).rejects.toThrow(
      ERROR_CODES.UNAUTHORIZED,
    )
    expect(polarCheckouts()).toStrictEqual([])
  })
})

describe("Polar webhooks", () => {
  it("records the purchase on order.paid and attaches the key on benefit_grant.created", async () => {
    const buyer = await signUpAndVerify()
    const order = await paidOrder(buyer, LICENSE_TIER.COMPLETE)

    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)).toBe(HTTP_STATUS.OK)
    expect(await currentLicense(buyer)).toMatchObject({
      key: null,
      polarOrderId: order.id,
      status: LICENSE_STATUS.ACTIVE,
      tier: LICENSE_TIER.COMPLETE,
    })

    const grant = grantPolarLicenseKey(order)
    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, grant)).toBe(HTTP_STATUS.OK)

    const licenseKey = polarLicenseKeyOf(grant)
    expect(await currentLicense(buyer)).toMatchObject({
      key: licenseKey.key,
      polarLicenseKeyId: licenseKey.id,
      status: LICENSE_STATUS.ACTIVE,
    })
  })

  it("keeps the licence through a partial refund and revokes it once the order is refunded in full", async () => {
    const { buyer, grant, order } = await buyLicense()
    const half = Math.floor(order.net_amount / 2)

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, half))
    expect(await currentLicense(buyer)).toMatchObject({ status: LICENSE_STATUS.ACTIVE })

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, order.net_amount - half))
    expect(await currentLicense(buyer)).toMatchObject({ status: LICENSE_STATUS.REVOKED })

    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked, revokePolarLicenseKey(grant))).toBe(HTTP_STATUS.OK)
    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)).toBe(HTTP_STATUS.OK)
    expect(await currentLicense(buyer)).toMatchObject({ polarOrderId: order.id, status: LICENSE_STATUS.REVOKED })
  })

  it("ignores refunds of other products and revocations of other benefits", async () => {
    const { buyer, grant, order } = await buyLicense()
    const otherProduct = createPolarOrder(
      { externalCustomerId: buyer.userId, tier: LICENSE_TIER.CORE },
      { product_id: crypto.randomUUID() },
    )

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(otherProduct.id, otherProduct.net_amount))
    await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked, { ...revokePolarLicenseKey(grant), properties: {} })

    expect(await currentLicense(buyer)).toMatchObject({ polarOrderId: order.id, status: LICENSE_STATUS.ACTIVE })
  })

  it("keeps a later purchase active when the earlier order is refunded", async () => {
    const buyer = await signUpAndVerify()
    const original = createPolarOrder(
      { externalCustomerId: buyer.userId, tier: LICENSE_TIER.CORE },
      { created_at: "2026-11-01T10:00:00.000Z" },
    )
    const upgrade = createPolarOrder(
      { externalCustomerId: buyer.userId, tier: LICENSE_TIER.COMPLETE },
      { created_at: "2026-11-02T10:00:00.000Z" },
    )
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, original)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, upgrade)

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(original.id, original.net_amount))

    expect(await currentLicense(buyer)).toMatchObject({
      polarOrderId: upgrade.id,
      status: LICENSE_STATUS.ACTIVE,
      tier: LICENSE_TIER.COMPLETE,
    })
  })

  it("revokes the licence when Polar revokes the key's benefit", async () => {
    const { buyer, grant } = await buyLicense()

    await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked, revokePolarLicenseKey(grant))

    expect(await currentLicense(buyer)).toMatchObject({ status: LICENSE_STATUS.REVOKED })
  })
})

describe("Polar webhook delivery order", () => {
  it("asks Polar to retry a key granted before its order, and attaches it on the retry", async () => {
    const buyer = await signUpAndVerify()
    const order = await paidOrder(buyer, LICENSE_TIER.CORE)
    const grant = grantPolarLicenseKey(order)
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, grant)).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    expect(await currentLicense(buyer)).toBeUndefined()

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)
    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, grant)).toBe(HTTP_STATUS.OK)
    expect(await currentLicense(buyer)).toMatchObject({ key: polarLicenseKeyOf(grant).key })
  })

  it("never activates a purchase whose refund arrived before its payment", async () => {
    const buyer = await signUpAndVerify()
    const order = await paidOrder(buyer, LICENSE_TIER.CORE)
    const grant = grantPolarLicenseKey(order)

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, order.net_amount))
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)

    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, grant)).toBe(HTTP_STATUS.OK)
    expect(await currentLicense(buyer)).toBeUndefined()
  })

  it("keeps one licence and one key when Polar delivers the same events twice", async () => {
    const { buyer, grant, order } = await buyLicense()
    const recorded = await currentLicense(buyer)

    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)).toBe(HTTP_STATUS.OK)
    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, grant)).toBe(HTTP_STATUS.OK)

    const redelivered = await currentLicense(buyer)
    expect(redelivered).toStrictEqual({ ...recorded, updatedAt: redelivered?.updatedAt })
  })

  it("keeps a newer purchase when an older paid order arrives late", async () => {
    const buyer = await signUpAndVerify()
    const older = createPolarOrder(
      { externalCustomerId: buyer.userId, tier: LICENSE_TIER.CORE },
      { created_at: "2026-11-01T10:00:00.000Z" },
    )
    const newer = createPolarOrder(
      { externalCustomerId: buyer.userId, tier: LICENSE_TIER.AGENCY },
      { created_at: "2026-11-02T10:00:00.000Z" },
    )

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, newer)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, older)

    expect(await currentLicense(buyer)).toMatchObject({ polarOrderId: newer.id, tier: LICENSE_TIER.AGENCY })
  })

  it("acknowledges every event for an account deleted after its purchase, and logs a new paid order", async () => {
    const { buyer, grant, order } = await buyLicense()
    const later = createPolarOrder({ externalCustomerId: buyer.userId, tier: LICENSE_TIER.AGENCY })
    await db.delete(user).where(eq(user.id, buyer.userId))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    const statuses = [
      await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, order.net_amount)),
      await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked, revokePolarLicenseKey(grant)),
      await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, later),
    ]

    expect(statuses).toStrictEqual([HTTP_STATUS.OK, HTTP_STATUS.OK, HTTP_STATUS.OK])
    expect(consoleError).toHaveBeenCalledWith(`[license] order ${later.id} does not map to a known account and tier`)
  })
})

describe("Polar webhook signatures", () => {
  it.each([
    ["signed with another secret", { secret: "whsec_another" }],
    ["signed too long ago", { sentAt: new Date(Date.now() - STALE_SIGNATURE_MS) }],
  ])("rejects an order.paid %s with 403 and records nothing", async (_case, signing) => {
    const buyer = await signUpAndVerify()
    const order = await paidOrder(buyer, LICENSE_TIER.CORE)
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order, signing)).toBe(HTTP_STATUS.FORBIDDEN)
    expect(await currentLicense(buyer)).toBeUndefined()
  })

  it("rejects a signed order.paid whose body was changed after signing", async () => {
    const buyer = await signUpAndVerify()
    const order = await paidOrder(buyer, LICENSE_TIER.CORE)
    const { body, headers } = signedPolarWebhook({
      data: order,
      secret: env.POLAR_WEBHOOK_SECRET,
      type: LICENSE_WEBHOOK_EVENTS.onOrderPaid,
    })
    const tampered = body.replace(POLAR_PRODUCT_IDS[LICENSE_TIER.CORE], POLAR_PRODUCT_IDS[LICENSE_TIER.AGENCY])
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await postWebhook(tampered, headers)).toBe(HTTP_STATUS.FORBIDDEN)
    expect(await currentLicense(buyer)).toBeUndefined()
  })

  it("rejects an unsigned delivery", async () => {
    const buyer = await signUpAndVerify()
    const order = await paidOrder(buyer, LICENSE_TIER.CORE)
    vi.spyOn(console, "error").mockImplementation(() => {})

    const unsigned = JSON.stringify({ data: order, type: LICENSE_WEBHOOK_EVENTS.onOrderPaid })

    expect(await postWebhook(unsigned, { "content-type": "application/json" })).toBe(HTTP_STATUS.FORBIDDEN)
    expect(await currentLicense(buyer)).toBeUndefined()
  })
})

describe("licence activations", () => {
  it("shows nothing to manage before Polar has granted the key", async () => {
    const buyer = await signUpAndVerify()
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, await paidOrder(buyer, LICENSE_TIER.CORE))
    actAs(buyer)

    await expect(executeQuery(licenseActivationsQuery)).resolves.toStrictEqual({ activations: [], limitActivations: 0 })
  })

  it("lists the machines activated with the buyer's key and the key's limit", async () => {
    const { buyer, grant } = await buyLicense()
    const laptop = activatePolarLicenseKey(grant, "Laptop")
    const server = activatePolarLicenseKey(grant, "CI server")
    actAs(buyer)

    await expect(executeQuery(licenseActivationsQuery)).resolves.toStrictEqual({
      activations: [laptop, server],
      limitActivations: LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE],
    })
  })

  it("deactivates one machine with the buyer's own key and frees its slot", async () => {
    const { buyer, grant } = await buyLicense()
    const laptop = activatePolarLicenseKey(grant, "Laptop")
    const server = activatePolarLicenseKey(grant, "CI server")
    actAs(buyer)

    await expect(executeMutation(deactivateLicenseMutation, { activationId: laptop.id })).resolves.toStrictEqual({ deactivated: true })

    expect(polarLicenseKeyOf(grant).activations).toStrictEqual([server])
    await expect(executeQuery(licenseActivationsQuery)).resolves.toMatchObject({ activations: [server] })
  })

  it("cannot deactivate a machine activated with another buyer's key", async () => {
    const owner = await buyLicense()
    const other = await buyLicense()
    const ownerMachine = activatePolarLicenseKey(owner.grant, "Laptop")
    vi.spyOn(console, "error").mockImplementation(() => {})
    actAs(other.buyer)

    await expect(executeMutation(deactivateLicenseMutation, { activationId: ownerMachine.id })).rejects.toThrow(ERROR_CODES.INTERNAL_ERROR)

    expect(polarLicenseKeyOf(owner.grant).activations).toStrictEqual([ownerMachine])
  })
})
