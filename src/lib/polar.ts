import { PolarClientError } from "@polar-sh/sdk"
import { createPolarCore, type models } from "@polar-sh/sdk/2026-10"
import { createDiscountsService } from "@polar-sh/sdk/2026-10/services/discounts"
import { createProductsService } from "@polar-sh/sdk/2026-10/services/products"
import { createWebhooksService } from "@polar-sh/sdk/2026-10/services/webhooks"
import * as zod from "zod"

import {
  BASIS_POINTS_PER_PERCENT,
  findRegionalDiscount,
  isAutomaticPercentage,
  toRegionalDiscount,
} from "~/src/integrations/polar/polar.discounts"

import { DEPLOYED_HOSTS, ENVIRONMENT, HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { toMinorUnits } from "~/src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import {
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_CHECKOUT_FIELD,
  LICENSE_TIER,
  LICENSE_TIERS,
  type LicenseTier,
} from "~/src/modules/license/license.constants"
import { PPP_PERCENTS_OFF } from "~/src/modules/license/license.pricing"

import { TIER_PRICES } from "~/src/data/marketing"
import { POLAR_SERVER } from "~/src/data/polar"
import { POLAR_EVENTS } from "~/src/data/polar-events"
import { REFUND_TERMS } from "~/src/data/refunds"

import { APP_NAME } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

export const POLAR_PRICE_TYPE = {
  CUSTOM: "custom",
  FIXED: "fixed",
} as const satisfies Record<string, models.ProductPrice["amount_type"]>

export const POLAR_BENEFIT_TYPE = {
  CUSTOM: "custom",
  LICENSE_KEYS: "license_keys",
} as const satisfies Record<string, models.BenefitType>

export const POLAR_CUSTOM_FIELD_TYPE = {
  CHECKBOX: "checkbox",
} as const satisfies Record<string, models.CustomFieldType>

export const WITHDRAWAL_CONSENT_FIELD = {
  label: `I ask ${APP_NAME} to supply my purchase immediately, and I acknowledge that I lose my ${String(REFUND_TERMS.WITHDRAWAL_DAYS)}-day right of withdrawal once supply begins, when my licence key is issued. [Refund Policy](https://${DEPLOYED_HOSTS[ENVIRONMENT.PRODUCTION]}${ROUTES.REFUNDS})`,
  name: "Consent to immediate supply",
  slug: LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT,
  type: POLAR_CUSTOM_FIELD_TYPE.CHECKBOX,
} as const

export const POLAR_WEBHOOK_FORMAT = {
  RAW: "raw",
  SLACK: "slack",
} as const satisfies Record<string, models.WebhookFormat>

export const POLAR_SCOPE = {
  DISCOUNTS: "discounts:read",
  PRODUCTS: "products:read",
  WEBHOOKS: "webhooks:read",
} as const

const POLAR_SERVER_BY_ENVIRONMENT = {
  [ENVIRONMENT.DEVELOPMENT]: POLAR_SERVER.SANDBOX,
  [ENVIRONMENT.PREVIEW]: POLAR_SERVER.SANDBOX,
  [ENVIRONMENT.PRODUCTION]: POLAR_SERVER.PRODUCTION,
} as const

export type PolarEnvironment = keyof typeof POLAR_SERVER_BY_ENVIRONMENT

type PolarServer = (typeof POLAR_SERVER)[keyof typeof POLAR_SERVER]

const PRODUCT_ID_KEYS = {
  [LICENSE_TIER.AGENCY]: "POLAR_PRODUCT_ID_AGENCY",
  [LICENSE_TIER.COMPLETE]: "POLAR_PRODUCT_ID_COMPLETE",
  [LICENSE_TIER.CORE]: "POLAR_PRODUCT_ID_CORE",
} as const satisfies Record<LicenseTier, string>

const PAGE_SIZE = 100

const settingValue = zod.string().trim().nonempty()

const settingsSchema = zod.object({
  POLAR_ACCESS_TOKEN: settingValue,
  POLAR_ORGANIZATION_ID: settingValue,
  POLAR_PRODUCT_ID_AGENCY: settingValue,
  POLAR_PRODUCT_ID_COMPLETE: settingValue,
  POLAR_PRODUCT_ID_CORE: settingValue,
  POLAR_SERVER: zod.enum(POLAR_SERVER),
  POLAR_WEBHOOK_SECRET: settingValue,
})

type Settings = zod.infer<typeof settingsSchema>

interface Source {
  readonly file: string
  readonly server: PolarServer
}

interface PolarState {
  readonly discounts: readonly models.Discount[]
  readonly endpoints: readonly models.WebhookEndpoint[]
  readonly products: readonly models.Product[]
}

type Check = readonly [failed: boolean, problem: string]

const DEPLOYED_ENVIRONMENTS = Object.keys(DEPLOYED_HOSTS).filter((name): name is keyof typeof DEPLOYED_HOSTS => name in DEPLOYED_HOSTS)

const failing = (checks: readonly Check[]): string[] => checks.filter(([failed]) => failed).map(([, problem]) => problem)

const webhookUrl = (host: string): string => `https://${host}${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.WEBHOOKS}`

const readSettings = (values: Readonly<Record<string, string | undefined>>, { file, server }: Source): Settings => {
  const parsed = settingsSchema.safeParse(values)

  if (!parsed.success) {
    throw new Error(`Set ${[...new Set(parsed.error.issues.map(({ path }) => path.join(".")))].join(", ")} in ${file}.`)
  }

  if (parsed.data.POLAR_SERVER !== server) {
    throw new Error(`Set POLAR_SERVER=${server} in ${file}: this environment must use the Polar ${server} server.`)
  }

  return parsed.data
}

const describeRefusal = (error: unknown, scope: string, { file, server }: Source): string => {
  if (error instanceof PolarClientError && error.statusCode === HTTP_STATUS.UNAUTHORIZED) {
    return `Polar ${server} rejects POLAR_ACCESS_TOKEN from ${file}: create an organisation token in the Polar ${server} and copy it there.`
  }

  if (error instanceof PolarClientError && error.statusCode === HTTP_STATUS.FORBIDDEN) {
    return `POLAR_ACCESS_TOKEN in ${file} lacks the ${scope} scope.`
  }

  return `Polar ${server} refused or failed a request that needs ${scope}: ${String(error)}`
}

interface Listing<Item> {
  readonly items: readonly Item[]
  readonly refusal?: string
}

const listAll = async <Item>(items: AsyncIterable<Item>, scope: string, source: Source): Promise<Listing<Item>> => {
  try {
    return { items: await Array.fromAsync(items) }
  } catch (error) {
    return { items: [], refusal: describeRefusal(error, scope, source) }
  }
}

const readPolar = async (settings: Settings, source: Source): Promise<PolarState> => {
  const polar = createPolarCore({ accessToken: settings.POLAR_ACCESS_TOKEN, environment: source.server })
  const query = { limit: PAGE_SIZE, organization_id: settings.POLAR_ORGANIZATION_ID }

  const [products, discounts, endpoints] = await Promise.all([
    listAll(createProductsService(polar).iterList(query), POLAR_SCOPE.PRODUCTS, source),
    listAll(createDiscountsService(polar).iterList(query), POLAR_SCOPE.DISCOUNTS, source),
    listAll(createWebhooksService(polar).iterListWebhookEndpoints(query), POLAR_SCOPE.WEBHOOKS, source),
  ])
  const refusals = new Set([products.refusal, discounts.refusal, endpoints.refusal].filter((refusal) => refusal !== undefined))

  if (refusals.size > 0) {
    throw new Error([`Polar ${source.server} could not be read with the token in ${source.file}:`, ...refusals].join("\n"))
  }

  return { discounts: discounts.items, endpoints: endpoints.items, products: products.items }
}

const priceProblems = (tier: LicenseTier, product: models.Product, label: string): string[] => {
  const prices = product.prices.filter(({ is_archived: archived }) => !archived)
  const amount = toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE)

  return [
    ...failing([[prices.length === 0, `${label} has no price.`]]),
    ...prices.flatMap((price) => {
      if (price.amount_type !== POLAR_PRICE_TYPE.FIXED) {
        return [`${label} has a ${price.amount_type} price; it must have a fixed price.`]
      }

      const currency = price.price_currency.toUpperCase()

      return failing([
        [
          currency !== DEFAULT_CURRENCY_CODE,
          `${label} is priced in ${currency} instead of ${DEFAULT_CURRENCY_CODE} (DEFAULT_CURRENCY_CODE).`,
        ],
        [
          price.price_amount !== amount,
          `${label} costs ${String(price.price_amount)} instead of ${String(amount)} minor units (TIER_PRICES.${tier}).`,
        ],
      ])
    }),
  ]
}

const licenseKeyProblems = (tier: LicenseTier, product: models.Product, label: string): string[] => {
  const licenseKeys = product.benefits.filter((benefit) => benefit.type === POLAR_BENEFIT_TYPE.LICENSE_KEYS)
  const [licenseKey, ...extraLicenseKeys] = licenseKeys

  if (licenseKey === undefined || extraLicenseKeys.length > 0) {
    return [`${label} has ${String(licenseKeys.length)} licence-key benefits; it needs exactly one.`]
  }

  const { activations, expires, limit_usage: usageLimit } = licenseKey.properties
  const limit = LICENSE_ACTIVATION_LIMITS[tier]

  return failing([
    [
      activations?.limit !== limit,
      `${label} issues keys with ${String(activations?.limit ?? "unlimited")} activations instead of ${String(limit)} (LICENSE_ACTIVATION_LIMITS.${tier}).`,
    ],
    [expires !== null, `${label} issues keys that expire; they must never expire.`],
    [usageLimit !== null, `${label} issues keys with a usage limit; they must have none.`],
  ])
}

const consentFieldProblems = (product: models.Product, label: string): string[] => {
  const { slug } = WITHDRAWAL_CONSENT_FIELD
  const attached = product.attached_custom_fields.find(({ custom_field: field }) => field.slug === slug)

  if (attached === undefined) {
    return [`${label} does not ask for the ${slug} checkout field (WITHDRAWAL_CONSENT_FIELD).`]
  }

  const { custom_field: field, required } = attached

  return failing([
    [!required, `${label} asks for the ${slug} checkout field without requiring it.`],
    [field.type !== WITHDRAWAL_CONSENT_FIELD.type, `The ${slug} checkout field is a ${field.type} field instead of a checkbox.`],
    [
      field.properties.form_label !== WITHDRAWAL_CONSENT_FIELD.label,
      `The ${slug} checkout field's label differs from WITHDRAWAL_CONSENT_FIELD.label.`,
    ],
  ])
}

const productProblems = (tier: LicenseTier, settings: Settings, products: readonly models.Product[]): string[] => {
  const key = PRODUCT_ID_KEYS[tier]
  const product = products.find(({ id }) => id === settings[key])
  const label = `The ${tier} product (${key})`

  if (product === undefined) {
    return [`${key} names no product of the organisation in POLAR_ORGANIZATION_ID.`]
  }

  return [
    ...failing([
      [product.is_archived, `${label} is archived.`],
      [product.is_recurring, `${label} is a subscription; it must be a one-time purchase.`],
    ]),
    ...priceProblems(tier, product, label),
    ...licenseKeyProblems(tier, product, label),
    ...consentFieldProblems(product, label),
  ]
}

const discountProblems = (settings: Settings, discounts: readonly models.Discount[], now: number): string[] => {
  const regionalDiscounts = discounts.filter((discount) => isAutomaticPercentage(discount)).map((discount) => toRegionalDiscount(discount))

  return PPP_PERCENTS_OFF.flatMap((percentOff) => {
    const uncovered = LICENSE_TIERS.filter(
      (tier) => findRegionalDiscount(regionalDiscounts, { now, percentOff, productId: settings[PRODUCT_ID_KEYS[tier]] }) === undefined,
    )

    return failing([
      [
        uncovered.length > 0,
        `No automatic ${String(percentOff)}% discount (${String(percentOff * BASIS_POINTS_PER_PERCENT)} basis points, no code) is redeemable for ${uncovered.join(", ")}.`,
      ],
    ])
  })
}

interface WebhookContext {
  readonly endpoints: readonly models.WebhookEndpoint[]
  readonly file: string
  readonly secret: string
}

const endpointProblems = ({ enabled, events, format, secret, url }: models.WebhookEndpoint, context: WebhookContext): string[] => {
  const missing = POLAR_EVENTS.filter((event) => !events.includes(event))
  const unhandled = events.filter((event) => !POLAR_EVENTS.includes(event))

  return failing([
    [!enabled, `The webhook endpoint for ${url} is disabled.`],
    [format !== POLAR_WEBHOOK_FORMAT.RAW, `The webhook endpoint for ${url} sends ${format} payloads instead of raw JSON.`],
    [secret !== context.secret, `The webhook endpoint for ${url} signs with another secret than POLAR_WEBHOOK_SECRET in ${context.file}.`],
    [missing.length > 0, `The webhook endpoint for ${url} does not send ${missing.join(", ")}.`],
    [unhandled.length > 0, `The webhook endpoint for ${url} also sends ${unhandled.join(", ")}, which no area handles (POLAR_EVENTS).`],
  ])
}

const ownWebhookProblems = (url: string, context: WebhookContext): string[] => {
  const matching = context.endpoints.filter((endpoint) => endpoint.url === url)

  return [
    ...failing([[matching.length === 0, `No webhook endpoint posts to ${url}.`]]),
    ...matching.flatMap((endpoint) => endpointProblems(endpoint, context)),
  ]
}

const foreignWebhookProblems = (server: PolarServer, endpoints: readonly models.WebhookEndpoint[]): string[] =>
  endpoints.flatMap(({ url }) =>
    DEPLOYED_ENVIRONMENTS.filter((name) => POLAR_SERVER_BY_ENVIRONMENT[name] !== server && DEPLOYED_HOSTS[name] === new URL(url).host).map(
      (name) => `A webhook endpoint posts to ${url}, the ${name} host, from this Polar ${server} organisation; remove it.`,
    ),
  )

const ownWebhookUrls = (environment: PolarEnvironment): string[] =>
  DEPLOYED_ENVIRONMENTS.filter((name) => name === environment).map((name) => webhookUrl(DEPLOYED_HOSTS[name]))

export const verifyPolar = async ({
  environment,
  values,
}: {
  readonly environment: PolarEnvironment
  readonly values: Readonly<Record<string, string | undefined>>
}): Promise<string> => {
  const source = { file: `.env.${environment}`, server: POLAR_SERVER_BY_ENVIRONMENT[environment] }
  const settings = readSettings(values, source)
  const { discounts, endpoints, products } = await readPolar(settings, source)
  const webhookUrls = ownWebhookUrls(environment)

  const problems = [
    ...LICENSE_TIERS.flatMap((tier) => productProblems(tier, settings, products)),
    ...discountProblems(settings, discounts, Date.now()),
    ...webhookUrls.flatMap((url) => ownWebhookProblems(url, { endpoints, file: source.file, secret: settings.POLAR_WEBHOOK_SECRET })),
    ...foreignWebhookProblems(source.server, endpoints),
  ]

  if (problems.length > 0) {
    throw new Error([`Polar ${source.server} does not match the code for ${environment}:`, ...problems].join("\n"))
  }

  const checked = [
    `${String(LICENSE_TIERS.length)} products with their prices, licence keys and consent field`,
    `${String(PPP_PERCENTS_OFF.length)} regional discounts`,
    ...webhookUrls.map((url) => `the webhook at ${url}`),
  ]

  return `Polar ${source.server} matches the code for ${environment}: ${checked.join("; ")}.`
}
