import type { Environment, models } from "@polar-sh/sdk/2026-10"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export const POLAR_CHECKOUT_ID_PLACEHOLDER = "{CHECKOUT_ID}"

export const POLAR_CUSTOMER_SESSION_TOKEN_PARAM = "customer_session_token" satisfies keyof models.CheckoutPublicConfirmed

export const POLAR_PRICE_CURRENCY = "usd" satisfies models.PresentmentCurrency

export const POLAR_MINIMUM_PRICE_AMOUNT = 50

export const POLAR_FIXED_PRICE = "fixed" satisfies models.ProductPriceFixedCreate["amount_type"]

export const POLAR_PRICE_TYPE = {
  CUSTOM: "custom",
  FIXED: "fixed",
  METERED_TIERS: "metered_tiers",
  METERED_UNIT: "metered_unit",
  SEAT_BASED: "seat_based",
  UNIT_BASED: "unit_based",
} as const satisfies Record<string, models.ProductPrice["amount_type"]>

export const POLAR_BENEFIT_TYPE = {
  CUSTOM: "custom",
  LICENSE_KEYS: "license_keys",
} as const satisfies Record<string, models.BenefitType>

export const POLAR_PRODUCT_VISIBILITY = {
  DRAFT: "draft",
  PRIVATE: "private",
  PUBLIC: "public",
} as const satisfies Record<string, models.ProductVisibility>

export const POLAR_PRODUCT_STATUS = {
  ARCHIVED: "archived",
  ...POLAR_PRODUCT_VISIBILITY,
} as const

export const POLAR_PRODUCT_STATUSES = [
  POLAR_PRODUCT_STATUS.PUBLIC,
  POLAR_PRODUCT_STATUS.PRIVATE,
  POLAR_PRODUCT_STATUS.DRAFT,
  POLAR_PRODUCT_STATUS.ARCHIVED,
] as const

export type PolarProductStatus = (typeof POLAR_PRODUCT_STATUSES)[number]

export const POLAR_PRODUCT_SORTING = {
  NAME: "name",
} as const satisfies Record<string, models.ProductSortProperty>

export const POLAR_PAGE_SIZE = 100

export const POLAR_SCOPE = {
  CHECKOUTS: "checkouts:write",
  CUSTOMER_SESSIONS: "customer_sessions:write",
  LICENSE_KEYS: "license_keys:write",
  ORDERS: "orders:read",
  ORGANIZATIONS: "organizations:read",
  PRODUCTS: "products:read",
  WEBHOOKS: "webhooks:read",
} as const

export type PolarScope = (typeof POLAR_SCOPE)[keyof typeof POLAR_SCOPE]

export const POLAR_ID_MAX_LENGTH = 64

export const POLAR_ORDER_STATUS = {
  DRAFT: "draft",
  PAID: "paid",
  PARTIALLY_REFUNDED: "partially_refunded",
  PENDING: "pending",
  REFUNDED: "refunded",
  VOID: "void",
} as const satisfies Record<string, models.OrderStatus>

export const POLAR_SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  CANCELED: "canceled",
  INCOMPLETE: "incomplete",
  INCOMPLETE_EXPIRED: "incomplete_expired",
  PAST_DUE: "past_due",
  PAUSED: "paused",
  TRIALING: "trialing",
  TRIAL_ENDED: "trial_ended",
  UNPAID: "unpaid",
} as const satisfies Record<string, models.SubscriptionStatus>

export const POLAR_RECURRING_INTERVAL = {
  DAY: "day",
  MONTH: "month",
  WEEK: "week",
  YEAR: "year",
} as const satisfies Record<string, models.RecurringInterval>

export const POLAR_LICENSE_KEY_STATUS = {
  DISABLED: "disabled",
  GRANTED: "granted",
  REVOKED: "revoked",
} as const satisfies Record<string, models.LicenseKeyStatus>

export const POLAR_WEBHOOK_EVENT = {
  ORDER_CREATED: "order.created",
  ORDER_PAID: "order.paid",
  ORDER_REFUNDED: "order.refunded",
  ORDER_UPDATED: "order.updated",
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_UPDATED: "subscription.updated",
} as const satisfies Record<string, models.WebhookEventType>

export const POLAR_SERVER = {
  PRODUCTION: "production",
  SANDBOX: "sandbox",
} as const satisfies Record<string, Environment>

export const POLAR_DASHBOARD_HOSTS = {
  [POLAR_SERVER.PRODUCTION]: "polar.sh",
  [POLAR_SERVER.SANDBOX]: "sandbox.polar.sh",
} as const satisfies Record<Environment, string>

export const polarCheckoutOrigin = (server: Environment): string => `https://${POLAR_DASHBOARD_HOSTS[server]}`

export const POLAR_ORGANIZATION_SLUG = "saasyland"

export const polarDashboardUrl = (server: Environment, ...path: readonly string[]): string =>
  new URL(
    ["", "dashboard", POLAR_ORGANIZATION_SLUG, ...path].map((segment) => encodeURIComponent(segment)).join("/"),
    polarCheckoutOrigin(server),
  ).toString()

export const POLAR_CHECKOUT_DEFAULT_LANGUAGE = "en"

export const POLAR_CHECKOUT_LANGUAGES: Readonly<Partial<Record<SupportedLocale, string>>> = {
  "de-DE": "de",
  "en-US": POLAR_CHECKOUT_DEFAULT_LANGUAGE,
  "es-ES": "es",
  "fr-FR": "fr",
  "it-IT": "it",
  "ja-JP": "ja",
  "pl-PL": "pl",
  "pt-BR": "pt",
}

export const polarCheckoutLanguage = (locale: SupportedLocale): string =>
  POLAR_CHECKOUT_LANGUAGES[locale] ?? POLAR_CHECKOUT_DEFAULT_LANGUAGE

export const isPolarCheckoutTranslated = (locale: SupportedLocale): boolean => locale in POLAR_CHECKOUT_LANGUAGES
