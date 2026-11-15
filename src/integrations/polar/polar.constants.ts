import type { models } from "@polar-sh/sdk/2026-10"

export const POLAR_CHECKOUT_ID_PLACEHOLDER = "{CHECKOUT_ID}"

export const POLAR_ORDER_STATUS = {
  PAID: "paid",
  PARTIALLY_REFUNDED: "partially_refunded",
  REFUNDED: "refunded",
} as const satisfies Record<string, models.OrderStatus>

export const POLAR_LICENSE_KEY_STATUS = {
  DISABLED: "disabled",
  GRANTED: "granted",
  REVOKED: "revoked",
} as const satisfies Record<string, models.LicenseKeyStatus>

export const POLAR_WEBHOOK_EVENT = {
  ORDER_PAID: "order.paid",
  ORDER_REFUNDED: "order.refunded",
} as const satisfies Record<string, models.WebhookEventType>
