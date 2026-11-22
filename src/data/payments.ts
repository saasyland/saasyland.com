import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import type { OrderStatus } from "~/src/modules/order/order.constants"

import type { AdminStatusColor } from "~/src/data/admin"

export const ORDER_STATUS_COLORS: Record<OrderStatus, AdminStatusColor> = {
  [POLAR_ORDER_STATUS.DRAFT]: "neutral",
  [POLAR_ORDER_STATUS.PAID]: "emerald",
  [POLAR_ORDER_STATUS.PARTIALLY_REFUNDED]: "amber",
  [POLAR_ORDER_STATUS.PENDING]: "amber",
  [POLAR_ORDER_STATUS.REFUNDED]: "rose",
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
