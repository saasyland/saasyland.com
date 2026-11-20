import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

export const ORDER_STATUSES = [
  POLAR_ORDER_STATUS.DRAFT,
  POLAR_ORDER_STATUS.PENDING,
  POLAR_ORDER_STATUS.PAID,
  POLAR_ORDER_STATUS.REFUNDED,
  POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
  POLAR_ORDER_STATUS.VOID,
] as const

export const REVENUE_ORDER_STATUSES = [
  POLAR_ORDER_STATUS.PAID,
  POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
  POLAR_ORDER_STATUS.REFUNDED,
] as const satisfies readonly (typeof ORDER_STATUSES)[number][]

export const ORDER_QUERY_KEYS = {
  ALL: ["order"],
  REVENUE: ["order", "getRevenue"],
} as const
