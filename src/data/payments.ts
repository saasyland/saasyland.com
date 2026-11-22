import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import type { OrderStatus } from "~/src/modules/order/order.constants"

import type { BadgeVariant } from "~/src/presentation/components/shadcn/badge"

export const ORDER_STATUS_BADGES: Record<OrderStatus, BadgeVariant> = {
  [POLAR_ORDER_STATUS.DRAFT]: "neutral",
  [POLAR_ORDER_STATUS.PAID]: "accent",
  [POLAR_ORDER_STATUS.PARTIALLY_REFUNDED]: "warning",
  [POLAR_ORDER_STATUS.PENDING]: "warning",
  [POLAR_ORDER_STATUS.REFUNDED]: "destructive",
  [POLAR_ORDER_STATUS.VOID]: "neutral",
}

export const ORDER_MIRROR_DETAILS = [
  "placedAt",
  "changedAt",
  "product",
  "total",
  "refunded",
  "invoiceNumber",
  "subscription",
  "customerId",
] as const

export const ORDER_POLAR_AMOUNTS = ["subtotal", "discount", "net", "tax", "total", "refunded", "refundedTax"] as const

export const ORDER_POLAR_DETAILS = ["status", "discountName", "billingName", "billingCountry", "customerName", "customerEmail"] as const
