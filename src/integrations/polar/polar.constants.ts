import type { models } from "@polar-sh/sdk/2026-10"

export const POLAR_CHECKOUT_ID_PLACEHOLDER = "{CHECKOUT_ID}"

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
  ORDER_PAID: "order.paid",
  ORDER_REFUNDED: "order.refunded",
} as const satisfies Record<string, models.WebhookEventType>
