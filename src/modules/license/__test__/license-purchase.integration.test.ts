import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { signedPolarWebhook } from "~/src/platform/testing/lib/polar"
import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import {
  activatePolarLicenseKey,
  createPolarOrder,
  grantPolarLicenseKey,
  payPolarCheckout,
  polarCheckouts,
  polarLicenseKeyOf,
  refundPolarOrder,
  revokePolarLicenseKey,
} from "~/src/platform/testing/mocks/polar"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import {
  browserHeaders,
  createTestAccount,
  signUpAndVerify,
  signUpSignedIn,
  verifyEmail,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_LICENSE_KEY_STATUS, POLAR_MINIMUM_PRICE_AMOUNT, POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"

import { HTTP_STATUS, IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { fromMinorUnits, toMinorUnits } from "~/src/modules/_core/constants/currency"
import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { type BrowserState, type Buyer, RETURN_PATH, actAs, startCheckout } from "~/src/modules/license/__test__/fixtures/checkout"
import {
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_CHECKOUT_FIELD,
  LICENSE_CHECKOUT_METADATA,
  LICENSE_STATUS,
  LICENSE_TIER,
  LICENSE_WEBHOOK_EVENTS,
  type LicenseTier,
} from "~/src/modules/license/license.constants"
import { PPP_COOKIE, PPP_DECLINED, pppMultiplierKey, regionalPrice as roundedRegionalPrice } from "~/src/modules/license/license.pricing"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import { deactivateLicenseMutation } from "~/src/modules/license/use-cases/deactivate-license"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { licenseActivationsQuery } from "~/src/modules/license/use-cases/get-current-license-activations"
import { currentLicenseKeyQuery } from "~/src/modules/license/use-cases/get-current-license-key"
import { upgradePriceQuery } from "~/src/modules/license/use-cases/get-upgrade-price"
import { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"
import { user } from "~/src/modules/user/user.schema"

import { CLI_INIT_COMMAND } from "~/src/data/cli"
import { TIER_PRICES } from "~/src/data/marketing"
import { POLAR_CHECKOUT_DEFAULT_LANGUAGE, polarCheckoutOrigin } from "~/src/data/polar"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const STALE_SIGNATURE_MS = 600_000
const INCLUDED_VAT_RATE = 0.23
const CONSENT = { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: true }
const WEBHOOKS_URL = new URL(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`, TEST_APP_URL)

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

const paidOrder = async (buyer: Buyer, tier: LicenseTier = LICENSE_TIER.CORE, browser: BrowserState = {}): Promise<models.Order> => {
  const checkout = await startCheckout(buyer, { tier, ...browser })
  return payPolarCheckout(checkout.id, CONSENT)
}

const currentLicense = async (buyer: Buyer) => {
  actAs(buyer)
  const [{ license }, { key }] = await Promise.all([executeQuery(currentLicenseQuery), executeQuery(currentLicenseKeyQuery)])
  return license && { ...license, key }
}

const listPrice = (tier: LicenseTier): number => toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE)

const regionalPrice = (tier: LicenseTier, country: string): number =>
  toMinorUnits(roundedRegionalPrice(TIER_PRICES[tier], pppMultiplierKey(country)), DEFAULT_CURRENCY_CODE)

const buyLicense = async (tier: LicenseTier = LICENSE_TIER.CORE, browser: BrowserState = {}) => {
  const buyer = await signUpAndVerify()
  const order = await paidOrder(buyer, tier, browser)
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
      custom_field_data: {},
      discount_id: null,
      embed_origin: TEST_APP_URL,
      external_customer_id: buyer.userId,
      locale: "pl",
      metadata: { [LICENSE_CHECKOUT_METADATA.LOCALE]: "pl-PL" },
      net_amount: listPrice(LICENSE_TIER.COMPLETE),
      product_id: POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE],
      return_url: `${TEST_APP_URL}${RETURN_PATH}`,
      success_url: `${TEST_APP_URL}/pl-PL${ROUTES.APP}?checkoutId=${checkout.id}`,
    })
  })

  it("lets Polar's checkout open over the page that started it and report back only to that page's origin", async () => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { tier: LICENSE_TIER.CORE })

    expect(checkout.embed_origin).toBe(new URL(TEST_APP_URL).origin)
    expect(new URL(checkout.url).origin).toBe(polarCheckoutOrigin(env.POLAR_SERVER))
  })

  it.each(["http://attacker.example", "http://localhost:3030"])(
    "refuses a checkout requested through %s, a host this build does not serve, without asking Polar",
    async (origin) => {
      const buyer = await signUpAndVerify()
      const headers = new Headers(buyer.headers)
      vi.mocked(getRequest).mockReturnValue(new Request(`${origin}/_serverFn/license`, { headers, method: "POST" }))

      await expect(
        executeMutation(startCheckoutMutation, { locale: "en-US", returnPath: RETURN_PATH, tier: LICENSE_TIER.CORE }),
      ).rejects.toThrow(ERROR_CODES.FORBIDDEN)
      expect(polarCheckouts().filter(({ external_customer_id: customer }) => customer === buyer.userId)).toStrictEqual([])
    },
  )

  it("comes back from Polar with the page the buyer started from, such as the lesson they want to watch", async () => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { redirect: "/courses/the-walkthrough/billing", tier: LICENSE_TIER.COMPLETE })

    expect(checkout.success_url).toBe(
      `${TEST_APP_URL}${ROUTES.APP}?checkoutId=${checkout.id}&redirect=%2Fcourses%2Fthe-walkthrough%2Fbilling`,
    )
  })

  it("lets a buyer who has not confirmed their email yet pay straight away", async () => {
    const buyer = await signUpSignedIn()

    const checkout = await startCheckout(buyer, { tier: LICENSE_TIER.CORE })

    expect(checkout).toMatchObject({ customer_email: buyer.account.email, external_customer_id: buyer.userId })
  })

  it.each([
    ["de-DE", "de"],
    ["ja-JP", "ja"],
    ["pt-BR", "pt"],
    ["uk-UA", POLAR_CHECKOUT_DEFAULT_LANGUAGE],
  ] as const)("opens the checkout of a %s buyer in Polar's %s", async (locale, language) => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { locale, tier: LICENSE_TIER.CORE })

    expect(checkout.locale).toBe(language)
  })

  it("leaves the consent box for the buyer to tick on Polar's page, which takes no payment without it", async () => {
    const buyer = await signUpAndVerify()
    const checkout = await startCheckout(buyer, { tier: LICENSE_TIER.CORE })

    expect(checkout.custom_field_data).toStrictEqual({})
    expect(() => payPolarCheckout(checkout.id)).toThrow(LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT)
    expect(() => payPolarCheckout(checkout.id, { [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: false })).toThrow(
      LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT,
    )
    expect(payPolarCheckout(checkout.id, CONSENT).custom_field_data).toStrictEqual(CONSENT)
  })

  it("fills in the signed-in buyer's email and name and passes the buyer's address, so the checkout form asks for neither", async () => {
    const buyer = await signUpAndVerify({ ...createTestAccount(), name: "Ada Lovelace" })

    const checkout = await startCheckout(buyer, { tier: LICENSE_TIER.CORE })

    expect(checkout).toMatchObject({
      customer_email: buyer.account.email,
      customer_ip_address: buyer.headers.get(IP_ADDRESS_HEADER),
      customer_name: buyer.account.name,
      external_customer_id: buyer.userId,
    })
  })
})

describe("checkout prices, referrals and refusals", () => {
  it.each(["PT", "PL", "IN", "UA"])(
    "charges a buyer from %s the regional price the pricing cards show, in whole dollars",
    async (country) => {
      const buyer = await signUpAndVerify()

      const checkout = await startCheckout(buyer, { country, tier: LICENSE_TIER.AGENCY })

      expect(checkout).toMatchObject({ discount_id: null, net_amount: regionalPrice(LICENSE_TIER.AGENCY, country) })
      expect(checkout.net_amount % toMinorUnits(1, DEFAULT_CURRENCY_CODE)).toBe(0)
    },
  )

  it("charges the full price when the buyer turned regional pricing off", async () => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { cookie: `${PPP_COOKIE}=${PPP_DECLINED}`, country: "PL", tier: LICENSE_TIER.CORE })

    expect(checkout).toMatchObject({ discount_id: null, net_amount: listPrice(LICENSE_TIER.CORE) })
  })

  it("passes the affiliate referral to Polar, which keeps it on the paid order", async () => {
    const buyer = await signUpAndVerify()
    const referral = "cmh7q6ayf0001jz08referral"

    const checkout = await startCheckout(buyer, { cookie: `${AFFONSO.REFERRAL_COOKIE}=${referral}`, tier: LICENSE_TIER.CORE })

    const metadata = { [AFFONSO.METADATA_KEY]: referral, [LICENSE_CHECKOUT_METADATA.LOCALE]: "en-US" }
    expect(checkout.metadata).toStrictEqual(metadata)
    expect(payPolarCheckout(checkout.id, CONSENT).metadata).toStrictEqual(metadata)
  })

  it("sends Polar no referral when the buyer carries no affiliate cookie, and the paid order has none either", async () => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { tier: LICENSE_TIER.CORE })

    const metadata = { [LICENSE_CHECKOUT_METADATA.LOCALE]: "en-US" }
    expect(checkout.metadata).toStrictEqual(metadata)
    expect(payPolarCheckout(checkout.id, CONSENT).metadata).toStrictEqual(metadata)
  })

  it("refuses a second checkout for the tier the account already holds, without asking Polar", async () => {
    const { buyer } = await buyLicense()
    const checkoutsBefore = polarCheckouts().length

    actAs(buyer)
    await expect(
      executeMutation(startCheckoutMutation, { locale: "en-US", returnPath: RETURN_PATH, tier: LICENSE_TIER.CORE }),
    ).resolves.toStrictEqual({
      alreadyActive: true,
    })

    expect(polarCheckouts()).toHaveLength(checkoutsBefore)
  })

  it("lets an account whose licence was refunded buy again", async () => {
    const { buyer, order } = await buyLicense()
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, order.net_amount))

    const checkout = await startCheckout(buyer, { tier: LICENSE_TIER.COMPLETE })

    expect(checkout.product_id).toBe(POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE])
  })

  it("refuses a tier this app does not sell and a language it does not speak", () => {
    expect(licenseZodSchemas.startCheckout.safeParse({ locale: "en-US", returnPath: RETURN_PATH, tier: "enterprise" }).success).toBe(false)
    expect(licenseZodSchemas.startCheckout.safeParse({ locale: "xx-XX", returnPath: RETURN_PATH, tier: LICENSE_TIER.CORE }).success).toBe(
      false,
    )
  })

  it.each(["https://evil.example/app", "//evil.example/app", String.raw`/\evil.example`, "app/license"])(
    "refuses a back button that leaves the site, %s",
    (returnPath) => {
      expect(licenseZodSchemas.startCheckout.safeParse({ locale: "en-US", returnPath, tier: LICENSE_TIER.CORE }).success).toBe(false)
    },
  )

  it("refuses a visitor who is not signed in", async () => {
    vi.mocked(getRequest).mockReturnValue(new Request(`${TEST_APP_URL}/_serverFn/license`, { headers: browserHeaders(), method: "POST" }))

    await expect(
      executeMutation(startCheckoutMutation, { locale: "en-US", returnPath: RETURN_PATH, tier: LICENSE_TIER.CORE }),
    ).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
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

  it("confirms the purchase by email in the checkout's language, with the consent the buyer gave before paying", async () => {
    const buyer = await signUpAndVerify()
    const checkout = await startCheckout(buyer, { locale: "pl-PL", tier: LICENSE_TIER.COMPLETE })
    const order = payPolarCheckout(checkout.id, CONSENT)

    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)).toBe(HTTP_STATUS.OK)

    const confirmations = getSentEmails(buyer.account.email).filter(
      ({ idempotencyKey }) => idempotencyKey?.startsWith(`${EMAIL_PURPOSE.PURCHASE_CONFIRMATION}/`) === true,
    )
    expect(confirmations).toStrictEqual([expect.objectContaining({ subject: "Twoja licencja SaaSy Land na pakiet Komplet" })])
    expect(confirmations[0]?.html).toContain('lang="pl-PL"')
    expect(confirmations[0]?.html).toContain("prawo odstąpienia od umowy nie dotyczy tego zamówienia")
    expect(confirmations[0]?.html).toContain(CLI_INIT_COMMAND)
    expect(confirmations[0]?.html).toContain(`${TEST_APP_URL}/pl-PL${ROUTES.COURSES}`)
    expect(await currentLicense(buyer)).toMatchObject({ withdrawalConsentAt: new Date(order.created_at) })
  })

  it("keeps the licence through a partial refund and marks it refunded once the order is refunded in full", async () => {
    const { buyer, grant, order } = await buyLicense()
    const half = Math.floor(order.net_amount / 2)

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, half))
    expect(await currentLicense(buyer)).toMatchObject({ status: LICENSE_STATUS.ACTIVE })

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, order.net_amount - half))
    expect(await currentLicense(buyer)).toMatchObject({ status: LICENSE_STATUS.REFUNDED })

    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked, revokePolarLicenseKey(grant))).toBe(HTTP_STATUS.OK)
    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)).toBe(HTTP_STATUS.OK)
    expect(await currentLicense(buyer)).toMatchObject({ polarOrderId: order.id, status: LICENSE_STATUS.REFUNDED })
  })

  it("marks the licence refunded when Polar revokes the key's benefit before the refund arrives", async () => {
    const { buyer, grant, order } = await buyLicense()

    await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked, revokePolarLicenseKey(grant))
    expect(await currentLicense(buyer)).toMatchObject({ status: LICENSE_STATUS.REVOKED })

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, order.net_amount))
    expect(await currentLicense(buyer)).toMatchObject({ status: LICENSE_STATUS.REFUNDED })
  })

  it("ignores refunds of other products and revocations of other benefits", async () => {
    const { buyer, grant, order } = await buyLicense()
    const otherProduct = createPolarOrder(
      { externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] },
      { product_id: crypto.randomUUID() },
    )

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(otherProduct.id, otherProduct.net_amount))
    await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked, { ...revokePolarLicenseKey(grant), properties: {} })

    expect(await currentLicense(buyer)).toMatchObject({ polarOrderId: order.id, status: LICENSE_STATUS.ACTIVE })
  })

  it("keeps a later purchase active when the earlier order is refunded", async () => {
    const buyer = await signUpAndVerify()
    const original = createPolarOrder(
      { externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] },
      { created_at: "2026-11-01T10:00:00.000Z" },
    )
    const upgrade = createPolarOrder(
      { externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE] },
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

describe("a buyer who has not confirmed their email", () => {
  it("pays and holds an active licence, sees its key only after confirming the address, and never in between", async () => {
    const buyer = await signUpSignedIn()
    const order = await paidOrder(buyer, LICENSE_TIER.CORE)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)
    const grant = grantPolarLicenseKey(order)
    await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, grant)

    expect(await currentLicense(buyer)).toMatchObject({
      key: undefined,
      polarLicenseKeyId: polarLicenseKeyOf(grant).id,
      status: LICENSE_STATUS.ACTIVE,
    })

    await verifyEmail(buyer.account.email)

    expect(await currentLicense(buyer)).toMatchObject({ key: polarLicenseKeyOf(grant).key })
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
      { externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] },
      { created_at: "2026-11-01T10:00:00.000Z" },
    )
    const newer = createPolarOrder(
      { externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.AGENCY] },
      { created_at: "2026-11-02T10:00:00.000Z" },
    )

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, newer)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, older)

    expect(await currentLicense(buyer)).toMatchObject({ polarOrderId: newer.id, tier: LICENSE_TIER.AGENCY })
  })

  it("acknowledges every event for an account deleted after its purchase, and logs and reports a new paid order", async () => {
    const { buyer, grant, order } = await buyLicense()
    const later = createPolarOrder({ externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.AGENCY] })
    await db.delete(user).where(eq(user.id, buyer.userId))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    const statuses = [
      await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, order.net_amount)),
      await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked, revokePolarLicenseKey(grant)),
      await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, later),
    ]

    expect(statuses).toStrictEqual([HTTP_STATUS.OK, HTTP_STATUS.OK, HTTP_STATUS.OK])
    expect(consoleError).toHaveBeenCalledWith(`[license] paid order ${later.id} maps to no account`)
    expect(getSentEmails(CONTACT_EMAIL).map(({ subject }) => subject)).toStrictEqual(["Paid Agency order without a licence"])
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

  it("answers NOT_FOUND for a machine activated with another buyer's key and leaves it activated", async () => {
    const owner = await buyLicense()
    const other = await buyLicense()
    const ownerMachine = activatePolarLicenseKey(owner.grant, "Laptop")
    actAs(other.buyer)

    await expect(executeMutation(deactivateLicenseMutation, { activationId: ownerMachine.id })).rejects.toThrow(ERROR_CODES.NOT_FOUND)

    expect(polarLicenseKeyOf(owner.grant).activations).toStrictEqual([ownerMachine])
  })
})

const upgradeTo = async (buyer: Buyer, tier: LicenseTier, browser: BrowserState = {}) => {
  const checkout = await startCheckout(buyer, { tier, ...browser })
  return { checkout, order: payPolarCheckout(checkout.id, CONSENT) }
}

const priceOf = async (buyer: Buyer, tier: LicenseTier, browser: BrowserState = {}) => {
  actAs(buyer, browser)
  const { upgrade } = await executeQuery(upgradePriceQuery({ tier }))
  return upgrade
}

describe("upgrade prices", () => {
  it("prices an upgrade at the higher tier's price less what the buyer has paid for the licence", async () => {
    const { buyer } = await buyLicense(LICENSE_TIER.CORE)

    await expect(priceOf(buyer, LICENSE_TIER.COMPLETE)).resolves.toStrictEqual({
      amount: TIER_PRICES[LICENSE_TIER.COMPLETE] - TIER_PRICES[LICENSE_TIER.CORE],
      credit: TIER_PRICES[LICENSE_TIER.CORE],
      fromTier: LICENSE_TIER.CORE,
      price: TIER_PRICES[LICENSE_TIER.COMPLETE],
    })
  })

  it("charges a regional buyer the regional price of the higher tier less the regional price paid", async () => {
    const browser = { country: "IN" }
    const { buyer } = await buyLicense(LICENSE_TIER.CORE, browser)

    const upgrade = await priceOf(buyer, LICENSE_TIER.AGENCY, browser)

    expect(upgrade).toMatchObject({ amount: (regionalPrice(LICENSE_TIER.AGENCY, "IN") - regionalPrice(LICENSE_TIER.CORE, "IN")) / 100 })
  })

  it("asks nothing more of a buyer who has already paid what the higher tier costs them", async () => {
    const { buyer } = await buyLicense(LICENSE_TIER.CORE)

    await expect(priceOf(buyer, LICENSE_TIER.COMPLETE, { country: "UA" })).resolves.toMatchObject({ amount: 0 })
  })

  it("asks nothing when less than Polar's minimum price is left to pay", async () => {
    const { buyer, order } = await buyLicense(LICENSE_TIER.CORE)
    const almost = listPrice(LICENSE_TIER.COMPLETE) - order.net_amount - POLAR_MINIMUM_PRICE_AMOUNT + 1
    createPolarOrder(
      { externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] },
      { net_amount: almost, subtotal_amount: almost, total_amount: almost },
    )

    await expect(priceOf(buyer, LICENSE_TIER.COMPLETE)).resolves.toMatchObject({ amount: 0 })
  })

  it("counts only paid licence orders in US dollars, less what was refunded", async () => {
    const { buyer, order } = await buyLicense(LICENSE_TIER.CORE)
    const half = Math.floor(order.net_amount / 2)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, half))
    createPolarOrder({ externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] }, { currency: "eur" })
    createPolarOrder(
      { externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] },
      { status: POLAR_ORDER_STATUS.PENDING },
    )

    await expect(priceOf(buyer, LICENSE_TIER.COMPLETE)).resolves.toMatchObject({ credit: (order.net_amount - half) / 100 })
  })

  it("credits a price that included tax at what it charged, less what was refunded of it and of its tax", async () => {
    const { buyer, order } = await buyLicense(LICENSE_TIER.CORE)
    const tax = Math.round(order.subtotal_amount - order.subtotal_amount / (1 + INCLUDED_VAT_RATE))
    const refunded = { refunded_amount: Math.floor((order.subtotal_amount - tax) / 2), refunded_tax_amount: Math.floor(tax / 2) }
    const taxed = { ...refunded, net_amount: order.subtotal_amount - tax, status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED, tax_amount: tax }
    createPolarOrder({ externalCustomerId: buyer.userId, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] }, taxed)
    const kept = order.subtotal_amount - refunded.refunded_amount - refunded.refunded_tax_amount

    await expect(priceOf(buyer, LICENSE_TIER.COMPLETE)).resolves.toMatchObject({
      credit: fromMinorUnits(order.net_amount + kept, DEFAULT_CURRENCY_CODE),
    })
  })

  it("offers no upgrade to the tier the licence already has or to a lower one", async () => {
    const tier = LICENSE_TIER.CORE
    const { buyer } = await buyLicense(LICENSE_TIER.COMPLETE)

    await expect(priceOf(buyer, tier)).resolves.toBeUndefined()
    await expect(priceOf(buyer, LICENSE_TIER.COMPLETE)).resolves.toBeUndefined()
    actAs(buyer)
    await expect(executeMutation(startCheckoutMutation, { locale: "en-US", returnPath: RETURN_PATH, tier })).resolves.toStrictEqual({
      alreadyActive: true,
    })
  })

  it("offers no upgrade before the key is issued, or to an account without a licence", async () => {
    const buyer = await signUpAndVerify()

    await expect(priceOf(buyer, LICENSE_TIER.COMPLETE)).resolves.toBeUndefined()
    const order = await paidOrder(buyer, LICENSE_TIER.CORE)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, order)
    await expect(priceOf(buyer, LICENSE_TIER.COMPLETE)).resolves.toBeUndefined()
  })
})

describe("upgrades", () => {
  it("opens a checkout for the difference that names the licence it upgrades", async () => {
    const { buyer, order } = await buyLicense(LICENSE_TIER.CORE)

    const checkout = await startCheckout(buyer, { tier: LICENSE_TIER.COMPLETE })

    expect(checkout).toMatchObject({
      metadata: {
        [LICENSE_CHECKOUT_METADATA.LOCALE]: "en-US",
        [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_ORDER]: order.id,
        [LICENSE_CHECKOUT_METADATA.UPGRADE_FROM_TIER]: LICENSE_TIER.CORE,
      },
      net_amount: listPrice(LICENSE_TIER.COMPLETE) - listPrice(LICENSE_TIER.CORE),
      product_id: POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE],
    })
  })

  it("moves the paid upgrade's licence to the higher tier with its key and machines, and disables the upgrade's own key", async () => {
    const { buyer, grant, order } = await buyLicense(LICENSE_TIER.CORE)
    const laptop = activatePolarLicenseKey(grant, "Laptop")
    const before = await currentLicense(buyer)

    const upgrade = await upgradeTo(buyer, LICENSE_TIER.COMPLETE)
    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, upgrade.order)).toBe(HTTP_STATUS.OK)
    const upgradeGrant = grantPolarLicenseKey(upgrade.order)
    expect(await deliver(LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated, upgradeGrant)).toBe(HTTP_STATUS.OK)

    expect(await currentLicense(buyer)).toMatchObject({
      key: before?.key,
      polarLicenseKeyId: before?.polarLicenseKeyId,
      polarOrderId: order.id,
      status: LICENSE_STATUS.ACTIVE,
      tier: LICENSE_TIER.COMPLETE,
    })
    expect(polarLicenseKeyOf(grant)).toMatchObject({
      activations: [laptop],
      limit_activations: LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.COMPLETE],
      status: POLAR_LICENSE_KEY_STATUS.GRANTED,
    })
    expect(polarLicenseKeyOf(upgradeGrant).status).toBe(POLAR_LICENSE_KEY_STATUS.DISABLED)
    const confirmations = getSentEmails(buyer.account.email).filter(
      ({ idempotencyKey }) => idempotencyKey?.startsWith(`${EMAIL_PURPOSE.PURCHASE_CONFIRMATION}/`) === true,
    )
    expect(confirmations.map(({ subject }) => subject)).toStrictEqual(["Your SaaSy Land Core licence", "Your SaaSy Land Complete licence"])
  })

  it("keeps the higher tier when Polar delivers the upgrade again, and when an older upgrade arrives after a newer one", async () => {
    const { buyer } = await buyLicense(LICENSE_TIER.CORE)
    const toComplete = await upgradeTo(buyer, LICENSE_TIER.COMPLETE)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, toComplete.order)
    const toAgency = await upgradeTo(buyer, LICENSE_TIER.AGENCY)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, toAgency.order)

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, toComplete.order)
    expect(await currentLicense(buyer)).toMatchObject({ tier: LICENSE_TIER.AGENCY })

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(toComplete.order.id, toComplete.order.net_amount))
    expect(await currentLicense(buyer)).toMatchObject({ status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.AGENCY })
  })

  it("returns the licence to its earlier tier and machine limit when the upgrade is refunded in full", async () => {
    const { buyer, grant } = await buyLicense(LICENSE_TIER.CORE)
    const upgrade = await upgradeTo(buyer, LICENSE_TIER.COMPLETE)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, upgrade.order)

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(upgrade.order.id, upgrade.order.net_amount))

    expect(await currentLicense(buyer)).toMatchObject({ status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.CORE })
    expect(polarLicenseKeyOf(grant).limit_activations).toBe(LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE])
  })

  it("grants a paid upgrade whose licence was refunded meanwhile as a licence of its own", async () => {
    const { buyer, order } = await buyLicense(LICENSE_TIER.CORE)
    const upgrade = await upgradeTo(buyer, LICENSE_TIER.COMPLETE)
    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderRefunded, refundPolarOrder(order.id, order.net_amount))

    await deliver(LICENSE_WEBHOOK_EVENTS.onOrderPaid, upgrade.order)

    expect(await currentLicense(buyer)).toMatchObject({
      polarOrderId: upgrade.order.id,
      status: LICENSE_STATUS.ACTIVE,
      tier: LICENSE_TIER.COMPLETE,
    })
  })
})
