import type { models } from "@polar-sh/sdk/2026-10"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { BASIS_POINTS_PER_PERCENT, POLAR_DISCOUNT_TYPE } from "~/src/integrations/polar/polar.discounts"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { PPP_PERCENTS_OFF } from "~/src/modules/_core/constants/pricing"
import {
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_TIER,
  LICENSE_TIERS,
  LICENSE_WEBHOOK_EVENTS,
  type LicenseTier,
} from "~/src/modules/license/license.constants"

import { TIER_PRICES } from "~/src/data/marketing"

import {
  POLAR_BENEFIT_TYPE,
  POLAR_PRICE_TYPE,
  POLAR_SCOPE,
  POLAR_SERVER,
  POLAR_WEBHOOK_FORMAT,
  type PolarEnvironment,
  verifyPolar,
} from "~/src/lib/polar"

const ACCESS_TOKEN = "polar_oat_test"
const ORGANIZATION_ID = "organization-test"
const WEBHOOK_SECRET = "whsec_test"
const CREATED_AT = "2026-11-01T00:00:00.000Z"
const NOW = Date.parse("2026-11-14T12:00:00.000Z")
const FAKE_PAGE_SIZE = 2

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
  attached_custom_fields: [],
  benefits: [licenseKeys(tier)],
  id: PRODUCT_IDS[tier],
  is_deletable: false,
  medias: [],
  name: tier,
  prices: [fixedPrice(tier)],
  ...fields,
})

const discountProduct = (tier: LicenseTier): models.DiscountProduct => ({ ...PRODUCT_FIELDS, id: PRODUCT_IDS[tier], name: tier })

const DISCOUNT_FIELDS = {
  code: JSON_NULL,
  created_at: CREATED_AT,
  duration: "once",
  ends_at: JSON_NULL,
  max_redemptions: JSON_NULL,
  max_redemptions_per_customer: JSON_NULL,
  metadata: {},
  modified_at: JSON_NULL,
  organization_id: ORGANIZATION_ID,
  redemptions_count: 0,
  starts_at: JSON_NULL,
} as const

const regionalDiscount = (
  percentOff: number,
  fields: Partial<models.DiscountPercentageOnceForeverDuration> = {},
): models.DiscountPercentageOnceForeverDuration => ({
  ...DISCOUNT_FIELDS,
  basis_points: percentOff * BASIS_POINTS_PER_PERCENT,
  id: `regional-${String(percentOff)}`,
  name: `Regional ${String(percentOff)}%`,
  products: LICENSE_TIERS.map((tier) => discountProduct(tier)),
  type: POLAR_DISCOUNT_TYPE.PERCENTAGE,
  ...fields,
})

const noDiscount = (percentOff: number, tiers: string): string =>
  `No automatic ${String(percentOff)}% discount (${String(percentOff * BASIS_POINTS_PER_PERCENT)} basis points, no code) is redeemable for ${tiers}.`

const webhookEndpoint = (url: string, fields: Partial<models.WebhookEndpoint> = {}): models.WebhookEndpoint => ({
  api_version: "2026-10",
  created_at: CREATED_AT,
  enabled: true,
  events: Object.values(LICENSE_WEBHOOK_EVENTS),
  format: POLAR_WEBHOOK_FORMAT.RAW,
  id: `endpoint-${url}`,
  modified_at: JSON_NULL,
  organization_id: ORGANIZATION_ID,
  secret: WEBHOOK_SECRET,
  url,
  uses_standard_webhook_signature: true,
  ...fields,
})

interface PolarOrganisation {
  readonly discounts: readonly models.Discount[]
  readonly endpoints: readonly models.WebhookEndpoint[]
  readonly products: readonly models.Product[]
}

const MATCHING_ORGANISATION: PolarOrganisation = {
  discounts: PPP_PERCENTS_OFF.map((percentOff) => regionalDiscount(percentOff)),
  endpoints: [webhookEndpoint(PREVIEW_WEBHOOK)],
  products: LICENSE_TIERS.map((tier) => product(tier)),
}

const fetchMock = vi.fn<(input: string, init: RequestInit) => Promise<Response>>()

const paginate = (items: readonly unknown[], url: URL): Response => {
  const end = Number(url.searchParams.get("page")) * FAKE_PAGE_SIZE

  return Response.json({
    items: items.slice(end - FAKE_PAGE_SIZE, end),
    pagination: { max_page: Math.ceil(items.length / FAKE_PAGE_SIZE), total_count: items.length },
  })
}

const serve = (organisation: Partial<PolarOrganisation> = {}, refusals: Readonly<Record<string, Response>> = {}): void => {
  const { discounts, endpoints, products } = { ...MATCHING_ORGANISATION, ...organisation }
  const lists: Readonly<Record<string, readonly unknown[]>> = {
    "/v1/discounts/": discounts,
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
      `Polar sandbox matches the code for preview: 3 products with their prices and licence keys; 4 regional discounts; the webhook at ${PREVIEW_WEBHOOK}.`,
    )
    expect(new Set(requestedUrls().map(({ host, pathname }) => `${host}${pathname}`))).toStrictEqual(
      new Set(["sandbox-api.polar.sh/v1/products/", "sandbox-api.polar.sh/v1/discounts/", "sandbox-api.polar.sh/v1/webhooks/endpoints"]),
    )
    expect(requestedUrls().every(({ searchParams }) => searchParams.get("organization_id") === ORGANIZATION_ID)).toBe(true)
    expect(requestedUrls().every(({ searchParams }) => searchParams.get("limit") === "100")).toBe(true)
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
      `Polar production matches the code for production: 3 products with their prices and licence keys; 4 regional discounts; the webhook at ${PRODUCTION_WEBHOOK}.`,
    )
    expect(requestedUrls().every(({ host }) => host === SERVER_HOSTS[POLAR_SERVER.PRODUCTION])).toBe(true)
  })

  it("expects no webhook for development, which shares the sandbox organisation and its preview webhook", async () => {
    serve()

    await expect(verify(ENVIRONMENT.DEVELOPMENT)).resolves.toBe(
      "Polar sandbox matches the code for development: 3 products with their prices and licence keys; 4 regional discounts.",
    )
    expect(requestedUrls().every(({ host }) => host === SERVER_HOSTS[POLAR_SERVER.SANDBOX])).toBe(true)
  })

  it("accepts other benefits next to the licence key, archived prices and a regional discount for every product", async () => {
    serve({
      discounts: PPP_PERCENTS_OFF.map((percentOff) => regionalDiscount(percentOff, { products: [] })),
      products: LICENSE_TIERS.map((tier) =>
        product(tier, {
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
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({ error: "invalid_token" }, { status: 401 })))

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
    const insufficientScope = Response.json({ error: "insufficient_scope" }, { status: 403 })
    serve({}, { "/v1/discounts/": insufficientScope, "/v1/webhooks/endpoints": insufficientScope })

    await expect(verify(ENVIRONMENT.PRODUCTION)).rejects.toThrow(
      new Error(
        [
          "Polar production could not be read with the token in .env.production:",
          `POLAR_ACCESS_TOKEN in .env.production lacks the ${POLAR_SCOPE.DISCOUNTS} scope.`,
          `POLAR_ACCESS_TOKEN in .env.production lacks the ${POLAR_SCOPE.WEBHOOKS} scope.`,
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

describe("verifyPolar on the regional discounts", () => {
  const [first = 0, ...others] = PPP_PERCENTS_OFF
  const othersOffered = others.map((percentOff) => regionalDiscount(percentOff))

  it("reports a regional percentage with no automatic discount, naming every tier it misses", async () => {
    await expectPreviewProblems(
      { discounts: othersOffered },
      "No automatic 20% discount (2000 basis points, no code) is redeemable for core, complete, agency.",
    )
  })

  it("names only the tiers a discount does not apply to", async () => {
    await expectPreviewProblems(
      { discounts: [regionalDiscount(first, { products: [discountProduct(LICENSE_TIER.COMPLETE)] }), ...othersOffered] },
      noDiscount(first, "core, agency"),
    )
  })

  it.each([
    ["a discount code", { code: "REGIONAL" }],
    ["an end date that has passed", { ends_at: new Date(NOW).toISOString() }],
    ["a start date still to come", { starts_at: new Date(NOW + 1).toISOString() }],
    ["no redemptions left", { max_redemptions: 10, redemptions_count: 10 }],
  ])("does not count a discount with %s, as checkout would not apply it", async (_case, fields) => {
    await expectPreviewProblems(
      { discounts: [regionalDiscount(first, fields), ...othersOffered] },
      noDiscount(first, "core, complete, agency"),
    )
  })

  it("does not count a fixed-amount discount", async () => {
    const fixed: models.DiscountFixedOnceForeverDuration = {
      ...DISCOUNT_FIELDS,
      amount: 5000,
      amounts: { usd: 5000 },
      currency: "usd",
      id: "fixed",
      name: "Launch",
      products: LICENSE_TIERS.map((tier) => discountProduct(tier)),
      type: POLAR_DISCOUNT_TYPE.FIXED,
    }

    await expectPreviewProblems({ discounts: [fixed, ...othersOffered] }, noDiscount(first, "core, complete, agency"))
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
    await expectPreviewProblems(
      {
        endpoints: [
          webhookEndpoint(PREVIEW_WEBHOOK, {
            events: [LICENSE_WEBHOOK_EVENTS.onOrderPaid, LICENSE_WEBHOOK_EVENTS.onOrderRefunded, "checkout.created"],
          }),
        ],
      },
      `The webhook endpoint for ${PREVIEW_WEBHOOK} does not send benefit_grant.created, benefit_grant.revoked.`,
      `The webhook endpoint for ${PREVIEW_WEBHOOK} also sends checkout.created, which license.webhooks.ts does not handle.`,
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

it("lists every problem at once, in the order products, discounts, webhooks", async () => {
  const [missing = 0, ...offered] = PPP_PERCENTS_OFF

  await expectPreviewProblems(
    {
      discounts: offered.map((percentOff) => regionalDiscount(percentOff)),
      endpoints: [],
      products: LICENSE_TIERS.map((tier) => product(tier, { is_archived: tier === LICENSE_TIER.CORE })),
    },
    "The core product (POLAR_PRODUCT_ID_CORE) is archived.",
    noDiscount(missing, "core, complete, agency"),
    `No webhook endpoint posts to ${PREVIEW_WEBHOOK}.`,
  )
})
