import { POLAR_ORDER_STATUS, POLAR_SUBSCRIPTION_STATUS } from "~/src/integrations/polar/polar.constants"

import type { OrderStatus } from "~/src/modules/order/order.constants"
import type { SubscriptionStatus } from "~/src/modules/subscription/subscription.constants"

import type { BadgeVariant } from "~/src/presentation/components/shadcn/badge"

export const ORDER_STATUS_BADGES: Record<OrderStatus, BadgeVariant> = {
  [POLAR_ORDER_STATUS.DRAFT]: "neutral",
  [POLAR_ORDER_STATUS.PAID]: "accent",
  [POLAR_ORDER_STATUS.PARTIALLY_REFUNDED]: "warning",
  [POLAR_ORDER_STATUS.PENDING]: "warning",
  [POLAR_ORDER_STATUS.REFUNDED]: "destructive",
  [POLAR_ORDER_STATUS.VOID]: "neutral",
}

export const SUBSCRIPTION_STATUS_BADGES: Record<SubscriptionStatus, BadgeVariant> = {
  [POLAR_SUBSCRIPTION_STATUS.ACTIVE]: "accent",
  [POLAR_SUBSCRIPTION_STATUS.CANCELED]: "neutral",
  [POLAR_SUBSCRIPTION_STATUS.INCOMPLETE]: "warning",
  [POLAR_SUBSCRIPTION_STATUS.INCOMPLETE_EXPIRED]: "neutral",
  [POLAR_SUBSCRIPTION_STATUS.PAST_DUE]: "destructive",
  [POLAR_SUBSCRIPTION_STATUS.PAUSED]: "neutral",
  [POLAR_SUBSCRIPTION_STATUS.TRIALING]: "accent",
  [POLAR_SUBSCRIPTION_STATUS.TRIAL_ENDED]: "neutral",
  [POLAR_SUBSCRIPTION_STATUS.UNPAID]: "destructive",
}
