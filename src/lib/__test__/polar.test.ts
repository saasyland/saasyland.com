import type { models } from "@polar-sh/sdk/2026-10"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { POLAR_WEBHOOK_EVENT } from "~/src/integrations/polar/polar.constants"

import { ENVIRONMENT, HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import {
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_TIER,
  LICENSE_TIERS,
  LICENSE_WEBHOOK_EVENTS,
  type LicenseTier,
} from "~/src/modules/license/license.constants"

import { LOCAL_HOSTS } from "~/src/data/local-server"
import { TIER_PRICES } from "~/src/data/marketing"
import { POLAR_SERVER } from "~/src/data/polar"
import { POLAR_EVENTS } from "~/src/data/polar-events"
import { REFUND_TERMS } from "~/src/data/refunds"

import {
  POLAR_BENEFIT_TYPE,
  POLAR_CUSTOM_FIELD_TYPE,
  POLAR_PRICE_TYPE,
  POLAR_SCOPE,
  POLAR_TAX_BEHAVIOR,
  POLAR_WEBHOOK_FORMAT,
  type PolarEnvironment,
  WITHDRAWAL_CONSENT_FIELD,
  verifyPolar,
} from "~/src/lib/polar"

import { APP_DOMAIN, APP_PREVIEW_DOMAIN } from "~/src/presentation/branding"

const ACCESS_TOKEN = "polar_oat_test"
const ORGANIZATION_ID = "organization-test"
const WEBHOOK_SECRET = "whsec_test"
const CREATED_AT = "2026-11-01T00:00:00.000Z"
const NOW = Date.parse("2026-11-14T12:00:00.000Z")
const FAKE_PAGE_SIZE = 2
const EMBED_HOSTS = [APP_DOMAIN, `*.${APP_DOMAIN}`, ...LOCAL_HOSTS]

const PREVIEW_WEBHOOK = "https://preview.saasyland.com/api/auth/polar/webhooks"
const PRODUCTION_WEBHOOK = "https://saasyland.com/api/auth/polar/webhooks"

const PRODUCT_IDS = {
  [LICENSE_TIER.AGENCY]: "product-agency",
  [LICENSE_TIER.COMPLETE]: "product-complete",
  [LICENSE_TIER.CORE]: "product-core",
} as const satisfies Record<LicenseTier, string>

const SERVER_HOSTS = {
  [POLAR_SERVER.PRODUCTION]: "api.polar.sh",
  [POLAR_SERVER.SANDBOX]: "sandbox-api.polar.sh",
} as const

const SERVERS = {
  [ENVIRONMENT.DEVELOPMENT]: POLAR_SERVER.SANDBOX,
  [ENVIRONMENT.PREVIEW]: POLAR_SERVER.SANDBOX,
  [ENVIRONMENT.PRODUCTION]: POLAR_SERVER.PRODUCTION,
} as const satisfies Record<PolarEnvironment, string>

const valuesFor = (environment: PolarEnvironment): Record<string, string> => ({
  AUTH_SECRET: "unrelated",
  POLAR_ACCESS_TOKEN: ACCESS_TOKEN,
  POLAR_ORGANIZATION_ID: ORGANIZATION_ID,
  POLAR_PRODUCT_ID_AGENCY: PRODUCT_IDS[LICENSE_TIER.AGENCY],
  POLAR_PRODUCT_ID_COMPLETE: PRODUCT_IDS[LICENSE_TIER.COMPLETE],
  POLAR_PRODUCT_ID_CORE: PRODUCT_IDS[LICENSE_TIER.CORE],
  POLAR_SERVER: SERVERS[environment],
  POLAR_WEBHOOK_SECRET: WEBHOOK_SECRET,
})

const fixedPrice = (tier: LicenseTier, fields: Partial<models.ProductPriceFixed> = {}): models.ProductPriceFixed => ({
  amount_type: POLAR_PRICE_TYPE.FIXED,
  created_at: CREATED_AT,
  id: `price-${tier}`,
  is_archived: false,
  modified_at: JSON_NULL,
  price_amount: TIER_PRICES[tier] * 100,
  price_currency: DEFAULT_CURRENCY_CODE.toLowerCase(),
  product_id: PRODUCT_IDS[tier],
  source: "catalog",
  tax_behavior: JSON_NULL,
  ...fields,
})

const customPrice = (tier: LicenseTier): models.ProductPriceCustom => ({
  amount_type: POLAR_PRICE_TYPE.CUSTOM,
  created_at: CREATED_AT,
  id: `custom-price-${tier}`,
  is_archived: false,
  maximum_amount: JSON_NULL,
  minimum_amount: 100,
  modified_at: JSON_NULL,
  preset_amount: JSON_NULL,
  price_currency: DEFAULT_CURRENCY_CODE.toLowerCase(),
  product_id: PRODUCT_IDS[tier],
  source: "catalog",
  tax_behavior: JSON_NULL,
})

const BENEFIT_FIELDS = {
  created_at: CREATED_AT,
  deletable: true,
  is_deleted: false,
  metadata: {},
  modified_at: JSON_NULL,
  organization_id: ORGANIZATION_ID,
  selectable: true,
  visibility: "public",
  visibility_configurable: true,
} as const

const licenseKeys = (tier: LicenseTier, properties: Partial<models.BenefitLicenseKeysProperties> = {}): models.BenefitLicenseKeys => ({
  ...BENEFIT_FIELDS,
  description: `${tier} licence key`,
  id: `license-keys-${tier}`,
  properties: {
    activations: { enable_customer_admin: true, limit: LICENSE_ACTIVATION_LIMITS[tier] },
    expires: JSON_NULL,
    limit_usage: JSON_NULL,
    prefix: "SAASYLAND",
    ...properties,
  },
  type: POLAR_BENEFIT_TYPE.LICENSE_KEYS,
})

const customBenefit = (tier: LicenseTier): models.BenefitCustom => ({
  ...BENEFIT_FIELDS,
  description: `${tier} welcome note`,
  id: `custom-${tier}`,
  properties: { note: JSON_NULL },
  type: POLAR_BENEFIT_TYPE.CUSTOM,
})

const CUSTOM_FIELD_FIELDS = {
  created_at: CREATED_AT,
  metadata: {},
  modified_at: JSON_NULL,
  organization_id: ORGANIZATION_ID,
} as const

const consentField = (fields: Partial<models.CustomFieldCheckbox> = {}): models.CustomFieldCheckbox => ({
  ...CUSTOM_FIELD_FIELDS,
  id: "consent-field",
  name: WITHDRAWAL_CONSENT_FIELD.name,
  properties: { form_label: WITHDRAWAL_CONSENT_FIELD.label },
  slug: WITHDRAWAL_CONSENT_FIELD.slug,
  type: POLAR_CUSTOM_FIELD_TYPE.CHECKBOX,
  ...fields,
})

const textField = (slug: string): models.CustomFieldText => ({
  ...CUSTOM_FIELD_FIELDS,
  id: `text-field-${slug}`,
  name: slug,
  properties: { form_label: WITHDRAWAL_CONSENT_FIELD.label },
  slug,
  type: "text",
})

const attached = (field: models.CustomField, required = true): models.AttachedCustomField => ({
  custom_field: field,
  custom_field_id: field.id,
  order: 0,
  required,
})

const PRODUCT_FIELDS = {
  created_at: CREATED_AT,
  description: JSON_NULL,
  is_archived: false,
  is_recurring: false,
  metadata: {},
  meter_interval: JSON_NULL,
  meter_interval_count: JSON_NULL,
  modified_at: JSON_NULL,
  organization_id: ORGANIZATION_ID,
  recurring_interval: JSON_NULL,
  recurring_interval_count: JSON_NULL,
  trial_interval: JSON_NULL,
  trial_interval_count: JSON_NULL,
  visibility: "public",
} as const

const product = (tier: LicenseTier, fields: Partial<models.Product> = {}): models.Product => ({
  ...PRODUCT_FIELDS,
  attached_custom_fields: [attached(consentField())],
  benefits: [licenseKeys(tier)],
  id: PRODUCT_IDS[tier],
  is_deletable: false,
  medias: [],
  name: tier,
  prices: [fixedPrice(tier)],
  ...fields,
})

const webhookEndpoint = (url: string, fields: Partial<models.WebhookEndpoint> = {}): models.WebhookEndpoint => ({
  api_version: "2026-10",
  created_at: CREATED_AT,
  enabled: true,
  events: POLAR_EVENTS,
  format: POLAR_WEBHOOK_FORMAT.RAW,
  id: `endpoint-${url}`,
  modified_at: JSON_NULL,
  organization_id: ORGANIZATION_ID,
  secret: WEBHOOK_SECRET,
  url,
  uses_standard_webhook_signature: true,
  ...fields,
})

const organization = (
  featureSettings: models.Organization["feature_settings"],
  taxBehavior: models.Organization["default_tax_behavior"] = POLAR_TAX_BEHAVIOR.LOCATION,
  embedHosts: readonly string[] = EMBED_HOSTS,
): models.Organization => ({
  account_id: JSON_NULL,
  allow_customer_updates: true,
  avatar_url: JSON_NULL,
  capabilities: {
    api_access: true,
    checkout_payments: true,
    dashboard_access: true,
    payouts: true,
    refunds: true,
    subscription_renewals: true,
  },
  created_at: CREATED_AT,
  customer_email_settings: {
    order_confirmation: true,
    payment_method_expiration_reminder: true,
    subscription_cancellation: true,
    subscription_confirmation: true,
    subscription_cycled: true,
    subscription_cycled_after_trial: true,
    subscription_past_due: true,
    subscription_paused: true,
    subscription_renewal_reminder: true,
    subscription_resumed: true,
    subscription_revoked: true,
    subscription_trial_conversion_reminder: true,
    subscription_uncanceled: true,
    subscription_updated: true,
  },
  customer_portal_settings: { subscription: { update_plan: true, update_seats: true }, usage: { show: true } },
  default_presentment_currency: DEFAULT_CURRENCY_CODE.toLowerCase(),
  default_tax_behavior: taxBehavior,
  details_submitted_at: CREATED_AT,
  dispute_settings: { auto_accept_below_amount: JSON_NULL },
  email: JSON_NULL,
  embed_hosts: [...embedHosts],
  feature_settings: featureSettings,
  id: ORGANIZATION_ID,
  modified_at: JSON_NULL,
  name: "SaaSy Land",
  onboarding_resubmission_requested_at: JSON_NULL,
  payout_account_id: JSON_NULL,
  proration_behavior: "prorate",
  slug: "saasyland",
  socials: [],
  sso_enforced: false,
  status: "active",
  subscription_settings: {
    allow_customer_updates: true,
    allow_multiple_subscriptions: false,
    benefit_revocation_grace_period: 0,
    prevent_trial_abuse: false,
    proration_behavior: "prorate",
  },
  website: JSON_NULL,
})

interface PolarOrganisation {
  readonly endpoints: readonly models.WebhookEndpoint[]
  readonly organization: models.Organization
  readonly products: readonly models.Product[]
}

const MATCHING_ORGANISATION: PolarOrganisation = {
  endpoints: [webhookEndpoint(PREVIEW_WEBHOOK)],
  organization: organization({ checkout_localization_enabled: true }),
  products: LICENSE_TIERS.map((tier) => product(tier)),
}

const TAX_NOT_LOCATION_BASED = `The organisation's default tax behaviour is not ${POLAR_TAX_BEHAVIOR.LOCATION}, which the pricing note promises: VAT included in the EU, sales tax added at checkout in the US, Canada and India; set it to location-based.`

const LOCALIZATION_OFF =
  "Checkout localization is off for the organisation, so Polar opens every checkout in English whatever locale startCheckout sends (POLAR_CHECKOUT_LANGUAGES); turn it on."

const embedRefused = (host: string): string =>
  `The organisation does not let ${host} embed its checkout, so the buy buttons there open Polar's checkout page instead of the overlay (openCheckoutOverlay); add ${host} under Settings > Embedding.`

const fetchMock = vi.fn<(input: string, init: RequestInit) => Promise<Response>>()

const paginate = (items: readonly unknown[], url: URL): Response => {
  const end = Number(url.searchParams.get("page")) * FAKE_PAGE_SIZE

  return Response.json({
    items: items.slice(end - FAKE_PAGE_SIZE, end),
    pagination: { max_page: Math.ceil(items.length / FAKE_PAGE_SIZE), total_count: items.length },
  })
}

const ORGANIZATION_PATH = `/v1/organizations/${ORGANIZATION_ID}`

const serve = (organisation: Partial<PolarOrganisation> = {}, refusals: Readonly<Record<string, Response>> = {}): void => {
  const { endpoints, organization: settings, products } = { ...MATCHING_ORGANISATION, ...organisation }
  const lists: Readonly<Record<string, readonly unknown[]>> = {
    "/v1/products/": products,
    "/v1/webhooks/endpoints": endpoints,
  }

  fetchMock.mockImplementation((input) => {
    const url = new URL(input)
    const refusal = refusals[url.pathname]
    const items = lists[url.pathname]

    if (refusal !== undefined) {
      return Promise.resolve(refusal.clone())
    }

    if (url.pathname === ORGANIZATION_PATH) {
      return Promise.resolve(Response.json(settings))
    }

    if (items === undefined) {
      return Promise.reject(new Error(`unexpected request to ${url.href}`))
    }

    return Promise.resolve(paginate(items, url))
  })
}

const verify = (
  environment: PolarEnvironment,
  values: Readonly<Record<string, string | undefined>> = valuesFor(environment),
): Promise<string> => verifyPolar({ environment, values })

const mismatch = (environment: PolarEnvironment, ...problems: readonly string[]): Error =>
  new Error([`Polar ${SERVERS[environment]} does not match the code for ${environment}:`, ...problems].join("\n"))

const expectPreviewProblems = async (organisation: Partial<PolarOrganisation>, ...problems: readonly string[]): Promise<void> => {
  serve(organisation)

  await expect(verify(ENVIRONMENT.PREVIEW)).rejects.toThrow(mismatch(ENVIRONMENT.PREVIEW, ...problems))
}

const withProduct = (tier: LicenseTier, fields: Partial<models.Product>): Partial<PolarOrganisation> => ({
  products: LICENSE_TIERS.map((each) => product(each, each === tier ? fields : {})),
})

const withCheckoutFields = (tier: LicenseTier, ...fields: readonly models.AttachedCustomField[]): Partial<PolarOrganisation> =>
  withProduct(tier, { attached_custom_fields: [...fields] })

const requestedUrls = (): URL[] => fetchMock.mock.calls.map(([input]) => new URL(input))

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(Date, "now").mockReturnValue(NOW)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("verifyPolar on an organisation that matches the code", () => {
  it("reads the preview sandbox organisation with the token and organisation from .env.preview, only with GET", async () => {
    serve()

    await expect(verify(ENVIRONMENT.PREVIEW)).resolves.toBe(
      `Polar sandbox matches the code for preview: checkout localization, tax behaviour and the hosts that embed the checkout; 3 products with their prices, licence keys and consent field; the webhook at ${PREVIEW_WEBHOOK}.`,
    )
    expect(new Set(requestedUrls().map(({ host, pathname }) => `${host}${pathname}`))).toStrictEqual(
      new Set([
        "sandbox-api.polar.sh/v1/products/",
        "sandbox-api.polar.sh/v1/webhooks/endpoints",
        `sandbox-api.polar.sh${ORGANIZATION_PATH}`,
      ]),
    )
    const listings = requestedUrls().filter(({ pathname }) => pathname !== ORGANIZATION_PATH)
    expect(listings.every(({ searchParams }) => searchParams.get("organization_id") === ORGANIZATION_ID)).toBe(true)
    expect(listings.every(({ searchParams }) => searchParams.get("limit") === "100")).toBe(true)
    expect(fetchMock.mock.calls.every(([, { method }]) => method === "GET")).toBe(true)
    expect(fetchMock.mock.calls.every(([, { headers }]) => new Headers(headers).get("Authorization") === `Bearer ${ACCESS_TOKEN}`)).toBe(
      true,
    )
  })

  it("reads every page Polar answers with", async () => {
    serve()

    await verify(ENVIRONMENT.PREVIEW)

    const productPages = requestedUrls().filter(({ pathname }) => pathname === "/v1/products/")
    expect(productPages.map(({ searchParams }) => searchParams.get("page"))).toStrictEqual(["1", "2"])
  })

  it("reads production from api.polar.sh and expects the production webhook", async () => {
    serve({ endpoints: [webhookEndpoint(PRODUCTION_WEBHOOK)] })

    await expect(verify(ENVIRONMENT.PRODUCTION)).resolves.toBe(
      `Polar production matches the code for production: checkout localization, tax behaviour and the hosts that embed the checkout; 3 products with their prices, licence keys and consent field; the webhook at ${PRODUCTION_WEBHOOK}.`,
    )
    expect(requestedUrls().every(({ host }) => host === SERVER_HOSTS[POLAR_SERVER.PRODUCTION])).toBe(true)
  })

  it("expects no webhook for development, which shares the sandbox organisation and its preview webhook", async () => {
    serve()

    await expect(verify(ENVIRONMENT.DEVELOPMENT)).resolves.toBe(
      "Polar sandbox matches the code for development: checkout localization, tax behaviour and the hosts that embed the checkout; 3 products with their prices, licence keys and consent field.",
    )
    expect(requestedUrls().every(({ host }) => host === SERVER_HOSTS[POLAR_SERVER.SANDBOX])).toBe(true)
  })

  it("accepts other benefits next to the licence key, other checkout fields and archived prices", async () => {
    serve({
      products: LICENSE_TIERS.map((tier) =>
        product(tier, {
          attached_custom_fields: [attached(textField("company"), false), attached(consentField())],
          benefits: [customBenefit(tier), licenseKeys(tier)],
          prices: [fixedPrice(tier, { id: `old-${tier}`, is_archived: true, price_amount: 1 }), fixedPrice(tier)],
        }),
      ),
    })

    await expect(verify(ENVIRONMENT.PREVIEW)).resolves.toContain("matches the code")
  })
})

describe("verifyPolar before it asks Polar", () => {
  it("names every Polar key missing or empty in the environment file", async () => {
    const values = {
      ...valuesFor(ENVIRONMENT.PREVIEW),
      POLAR_ACCESS_TOKEN: " ",
      POLAR_PRODUCT_ID_CORE: "",
      POLAR_WEBHOOK_SECRET: undefined,
    }

    await expect(verify(ENVIRONMENT.PREVIEW, values)).rejects.toThrow(
      new Error("Set POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID_CORE, POLAR_WEBHOOK_SECRET in .env.preview."),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [ENVIRONMENT.DEVELOPMENT, POLAR_SERVER.PRODUCTION, POLAR_SERVER.SANDBOX],
    [ENVIRONMENT.PREVIEW, POLAR_SERVER.PRODUCTION, POLAR_SERVER.SANDBOX],
    [ENVIRONMENT.PRODUCTION, POLAR_SERVER.SANDBOX, POLAR_SERVER.PRODUCTION],
  ] as const)("refuses %s on the Polar %s server", async (environment, server, expected) => {
    await expect(verify(environment, { ...valuesFor(environment), POLAR_SERVER: server })).rejects.toThrow(
      new Error(`Set POLAR_SERVER=${expected} in .env.${environment}: this environment must use the Polar ${expected} server.`),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("verifyPolar when Polar refuses the token", () => {
  it("says once that the server rejects the token, as with a production token against the sandbox", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({ error: "invalid_token" }, { status: HTTP_STATUS.UNAUTHORIZED })))

    await expect(verify(ENVIRONMENT.PREVIEW)).rejects.toThrow(
      new Error(
        [
          "Polar sandbox could not be read with the token in .env.preview:",
          "Polar sandbox rejects POLAR_ACCESS_TOKEN from .env.preview: create an organisation token in the Polar sandbox and copy it there.",
        ].join("\n"),
      ),
    )
  })

  it("names each scope the token lacks, in the order it reads them", async () => {
    const insufficientScope = Response.json({ error: "insufficient_scope" }, { status: HTTP_STATUS.FORBIDDEN })
    serve({}, { "/v1/products/": insufficientScope, "/v1/webhooks/endpoints": insufficientScope, [ORGANIZATION_PATH]: insufficientScope })

    await expect(verify(ENVIRONMENT.PRODUCTION)).rejects.toThrow(
      new Error(
        [
          "Polar production could not be read with the token in .env.production:",
          `POLAR_ACCESS_TOKEN in .env.production lacks the ${POLAR_SCOPE.PRODUCTS} scope.`,
          `POLAR_ACCESS_TOKEN in .env.production lacks the ${POLAR_SCOPE.WEBHOOKS} scope.`,
          `POLAR_ACCESS_TOKEN in .env.production lacks the ${POLAR_SCOPE.ORGANIZATIONS} scope.`,
        ].join("\n"),
      ),
    )
  })

  it.each([
    [
      "a server error",
      new Response("unavailable", { status: 503 }),
      "PolarServerError: Polar API returned a server error: 503 - unavailable",
    ],
    ["an unexpected client error", new Response("gone", { status: 410 }), 'PolarClientError: Polar API returned an error: 410 - "gone"'],
  ])("reports %s with the scope of the request", async (_case, response, error) => {
    serve({}, { "/v1/products/": response })

    await expect(verify(ENVIRONMENT.PREVIEW)).rejects.toThrow(
      `Polar sandbox refused or failed a request that needs ${POLAR_SCOPE.PRODUCTS}: ${error}`,
    )
  })
})

describe("verifyPolar on the tier products", () => {
  it("reports a product ID that names no product of the organisation", async () => {
    await expectPreviewProblems(
      { products: LICENSE_TIERS.filter((tier) => tier !== LICENSE_TIER.COMPLETE).map((tier) => product(tier)) },
      "POLAR_PRODUCT_ID_COMPLETE names no product of the organisation in POLAR_ORGANIZATION_ID.",
    )
  })

  it("reports an archived subscription", async () => {
    await expectPreviewProblems(
      withProduct(LICENSE_TIER.AGENCY, { is_archived: true, is_recurring: true }),
      "The agency product (POLAR_PRODUCT_ID_AGENCY) is archived.",
      "The agency product (POLAR_PRODUCT_ID_AGENCY) is a subscription; it must be a one-time purchase.",
    )
  })

  it("reports a product whose prices are all archived", async () => {
    await expectPreviewProblems(
      withProduct(LICENSE_TIER.CORE, { prices: [fixedPrice(LICENSE_TIER.CORE, { is_archived: true })] }),
      "The core product (POLAR_PRODUCT_ID_CORE) has no price.",
    )
  })

  it("reports a pay-what-you-want price", async () => {
    await expectPreviewProblems(
      withProduct(LICENSE_TIER.CORE, { prices: [customPrice(LICENSE_TIER.CORE)] }),
      "The core product (POLAR_PRODUCT_ID_CORE) has a custom price; it must have a fixed price.",
    )
  })

  it("reports a price in another currency or of another amount than TIER_PRICES", async () => {
    await expectPreviewProblems(
      withProduct(LICENSE_TIER.COMPLETE, { prices: [fixedPrice(LICENSE_TIER.COMPLETE, { price_amount: 29_900, price_currency: "eur" })] }),
      "The complete product (POLAR_PRODUCT_ID_COMPLETE) is priced in EUR instead of USD (DEFAULT_CURRENCY_CODE).",
      "The complete product (POLAR_PRODUCT_ID_COMPLETE) costs 29900 instead of 39900 minor units (TIER_PRICES.complete).",
    )
  })
})

describe("verifyPolar on the licence keys", () => {
  it.each([
    ["no licence-key benefit", [], 0],
    ["two licence-key benefits", [licenseKeys(LICENSE_TIER.CORE), licenseKeys(LICENSE_TIER.CORE)], 2],
  ])("reports %s", async (_case, benefits, count) => {
    await expectPreviewProblems(
      withProduct(LICENSE_TIER.CORE, { benefits }),
      `The core product (POLAR_PRODUCT_ID_CORE) has ${String(count)} licence-key benefits; it needs exactly one.`,
    )
  })

  it.each([
    ["another limit", { enable_customer_admin: true, limit: 5 }, "5"],
    ["no limit", JSON_NULL, "unlimited"],
  ])("reports keys with %s of activations than LICENSE_ACTIVATION_LIMITS", async (_case, activations, allowed) => {
    await expectPreviewProblems(
      withProduct(LICENSE_TIER.CORE, { benefits: [licenseKeys(LICENSE_TIER.CORE, { activations })] }),
      `The core product (POLAR_PRODUCT_ID_CORE) issues keys with ${allowed} activations instead of 3 (LICENSE_ACTIVATION_LIMITS.core).`,
    )
  })

  it("reports keys that expire or are limited in use", async () => {
    await expectPreviewProblems(
      withProduct(LICENSE_TIER.AGENCY, {
        benefits: [licenseKeys(LICENSE_TIER.AGENCY, { expires: { timeframe: "year", ttl: 1 }, limit_usage: 100 })],
      }),
      "The agency product (POLAR_PRODUCT_ID_AGENCY) issues keys that expire; they must never expire.",
      "The agency product (POLAR_PRODUCT_ID_AGENCY) issues keys with a usage limit; they must have none.",
    )
  })
})

describe("verifyPolar on the consent checkout field", () => {
  const { label, slug } = WITHDRAWAL_CONSENT_FIELD
  const companyField = attached(textField("company"))
  const optionalConsent = attached(consentField(), false)
  const textConsent = attached(textField(slug))
  const relabelledConsent = attached(consentField({ properties: { form_label: `${label} ` } }))

  it("reports a product whose checkout does not ask for the consent", async () => {
    await expectPreviewProblems(
      withCheckoutFields(LICENSE_TIER.CORE, companyField),
      `The core product (POLAR_PRODUCT_ID_CORE) does not ask for the ${slug} checkout field (WITHDRAWAL_CONSENT_FIELD).`,
    )
  })

  it("reports a consent the buyer may leave unticked", async () => {
    await expectPreviewProblems(
      withCheckoutFields(LICENSE_TIER.AGENCY, optionalConsent),
      `The agency product (POLAR_PRODUCT_ID_AGENCY) asks for the ${slug} checkout field without requiring it.`,
    )
  })

  it("reports a consent field that is not a checkbox or whose label differs from the wording in the code", async () => {
    await expectPreviewProblems(
      withCheckoutFields(LICENSE_TIER.COMPLETE, textConsent),
      `The ${slug} checkout field is a text field instead of a checkbox.`,
    )
    await expectPreviewProblems(
      withCheckoutFields(LICENSE_TIER.COMPLETE, relabelledConsent),
      `The ${slug} checkout field's label differs from WITHDRAWAL_CONSENT_FIELD.label.`,
    )
  })

  it("builds the label from the refund period and the production refund page", () => {
    expect(label).toBe(
      `I ask SaaSy Land to supply my purchase immediately, and I acknowledge that I lose my ${String(REFUND_TERMS.WITHDRAWAL_DAYS)}-day right of withdrawal once supply begins, when my licence key is issued. [Refund Policy](https://saasyland.com/refunds)`,
    )
  })
})

describe("verifyPolar on the webhook endpoints", () => {
  it("reports a missing webhook for the environment's host", async () => {
    await expectPreviewProblems({ endpoints: [] }, `No webhook endpoint posts to ${PREVIEW_WEBHOOK}.`)
  })

  it("reports a disabled endpoint that sends Slack messages signed with another secret", async () => {
    await expectPreviewProblems(
      { endpoints: [webhookEndpoint(PREVIEW_WEBHOOK, { enabled: false, format: POLAR_WEBHOOK_FORMAT.SLACK, secret: "whsec_other" })] },
      `The webhook endpoint for ${PREVIEW_WEBHOOK} is disabled.`,
      `The webhook endpoint for ${PREVIEW_WEBHOOK} sends slack payloads instead of raw JSON.`,
      `The webhook endpoint for ${PREVIEW_WEBHOOK} signs with another secret than POLAR_WEBHOOK_SECRET in .env.preview.`,
    )
  })

  it("reports events the handlers need but Polar does not send, and events no handler handles", async () => {
    const unsent = [
      LICENSE_WEBHOOK_EVENTS.onBenefitGrantCreated,
      LICENSE_WEBHOOK_EVENTS.onBenefitGrantRevoked,
      POLAR_WEBHOOK_EVENT.ORDER_CREATED,
      POLAR_WEBHOOK_EVENT.ORDER_UPDATED,
      POLAR_WEBHOOK_EVENT.SUBSCRIPTION_CREATED,
      POLAR_WEBHOOK_EVENT.SUBSCRIPTION_UPDATED,
    ]

    await expectPreviewProblems(
      {
        endpoints: [
          webhookEndpoint(PREVIEW_WEBHOOK, {
            events: [LICENSE_WEBHOOK_EVENTS.onOrderPaid, LICENSE_WEBHOOK_EVENTS.onOrderRefunded, "checkout.created"],
          }),
        ],
      },
      `The webhook endpoint for ${PREVIEW_WEBHOOK} does not send ${unsent.join(", ")}.`,
      `The webhook endpoint for ${PREVIEW_WEBHOOK} also sends checkout.created, which no area handles (POLAR_EVENTS).`,
    )
  })

  it("reports a preview endpoint in the production organisation, where real payments would reach preview", async () => {
    serve({ endpoints: [webhookEndpoint(PRODUCTION_WEBHOOK), webhookEndpoint(PREVIEW_WEBHOOK)] })

    await expect(verify(ENVIRONMENT.PRODUCTION)).rejects.toThrow(
      mismatch(
        ENVIRONMENT.PRODUCTION,
        `A webhook endpoint posts to ${PREVIEW_WEBHOOK}, the preview host, from this Polar production organisation; remove it.`,
      ),
    )
  })

  it.each([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.PREVIEW] as const)(
    "reports a production endpoint in the sandbox organisation %s uses",
    async (environment) => {
      serve({ endpoints: [webhookEndpoint(PREVIEW_WEBHOOK), webhookEndpoint(PRODUCTION_WEBHOOK)] })

      await expect(verify(environment)).rejects.toThrow(
        mismatch(
          environment,
          `A webhook endpoint posts to ${PRODUCTION_WEBHOOK}, the production host, from this Polar sandbox organisation; remove it.`,
        ),
      )
    },
  )
})

describe("verifyPolar on the organisation", () => {
  it.each([
    ["no feature settings", JSON_NULL],
    ["checkout localization unset", {}],
    ["checkout localization off", { checkout_localization_enabled: false }],
  ])("reports an organisation with %s, whose checkout ignores the buyer's language", async (_case, featureSettings) => {
    await expectPreviewProblems({ organization: organization(featureSettings) }, LOCALIZATION_OFF)
  })

  it.each([POLAR_TAX_BEHAVIOR.INCLUSIVE, POLAR_TAX_BEHAVIOR.EXCLUSIVE])(
    "reports an organisation whose default tax behaviour is %s, which the pricing note does not describe",
    async (taxBehavior) => {
      await expectPreviewProblems(
        { organization: organization({ checkout_localization_enabled: true }, taxBehavior) },
        TAX_NOT_LOCATION_BASED,
      )
    },
  )
})

const withEmbedHosts = (...embedHosts: readonly string[]): Partial<PolarOrganisation> => ({
  organization: organization({ checkout_localization_enabled: true }, POLAR_TAX_BEHAVIOR.LOCATION, embedHosts),
})

describe("verifyPolar on the hosts that embed the checkout", () => {
  it("reports the preview host when the sandbox organisation lets no host embed its checkout", async () => {
    await expectPreviewProblems(withEmbedHosts(), embedRefused(APP_PREVIEW_DOMAIN))
  })

  it("accepts the preview host through a wildcard for the domain's subdomains", async () => {
    serve(withEmbedHosts(`*.${APP_DOMAIN}`))

    await expect(verify(ENVIRONMENT.PREVIEW)).resolves.toContain("the hosts that embed the checkout")
  })

  it("reports the production domain, which a wildcard for its subdomains does not cover", async () => {
    serve({ ...withEmbedHosts(`*.${APP_DOMAIN}`), endpoints: [webhookEndpoint(PRODUCTION_WEBHOOK)] })

    await expect(verify(ENVIRONMENT.PRODUCTION)).rejects.toThrow(mismatch(ENVIRONMENT.PRODUCTION, embedRefused(APP_DOMAIN)))
  })

  it("reports each local host of the development server that the sandbox organisation leaves out, port included", async () => {
    const [listed, ...missing] = LOCAL_HOSTS
    serve(withEmbedHosts(String(listed), `${APP_DOMAIN}:3000`))

    await expect(verify(ENVIRONMENT.DEVELOPMENT)).rejects.toThrow(
      mismatch(ENVIRONMENT.DEVELOPMENT, ...missing.map((host) => embedRefused(host))),
    )
  })
})

it("lists every problem at once, in the order organisation, products, webhooks", async () => {
  await expectPreviewProblems(
    {
      endpoints: [],
      organization: organization({ checkout_localization_enabled: false }),
      products: LICENSE_TIERS.map((tier) => product(tier, { is_archived: tier === LICENSE_TIER.CORE })),
    },
    LOCALIZATION_OFF,
    "The core product (POLAR_PRODUCT_ID_CORE) is archived.",
    `No webhook endpoint posts to ${PREVIEW_WEBHOOK}.`,
  )
})
