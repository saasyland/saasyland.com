import type { Environment, models } from "@polar-sh/sdk/2026-10"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export const POLAR_CHECKOUT_ID_PLACEHOLDER = "{CHECKOUT_ID}"

export const POLAR_CUSTOMER_SESSION_TOKEN_PARAM = "customer_session_token" satisfies keyof models.CheckoutPublicConfirmed

export const POLAR_PRICE_CURRENCY = "usd" satisfies models.PresentmentCurrency

export const POLAR_MINIMUM_PRICE_AMOUNT = 50

export const POLAR_FIXED_PRICE = "fixed" satisfies models.ProductPriceFixedCreate["amount_type"]

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
