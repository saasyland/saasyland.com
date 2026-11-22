import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

export const ORDER_STATUSES = [
  POLAR_ORDER_STATUS.DRAFT,
  POLAR_ORDER_STATUS.PENDING,
  POLAR_ORDER_STATUS.PAID,
  POLAR_ORDER_STATUS.REFUNDED,
  POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
  POLAR_ORDER_STATUS.VOID,
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const REVENUE_ORDER_STATUSES = [
  POLAR_ORDER_STATUS.PAID,
  POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
  POLAR_ORDER_STATUS.REFUNDED,
] as const satisfies readonly OrderStatus[]

export const ORDER_SORT_COLUMNS = ["placedAt", "totalAmount", "status"] as const

export const CUSTOMER_SORT_COLUMNS = ["customer", "orders", "lastOrderAt", "signedUpAt"] as const

export const ORDER_SORT_COLUMNS_MAX = 3

export const ORDER_SEARCH_MAX_LENGTH = 120

export const POLAR_READ = {
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
} as const

export const ORDER_QUERY_KEYS = {
  ALL: ["order"],
  CUSTOMERS: ["order", "getCustomers"],
  DETAIL: ["order", "getOrder"],
  LIST: ["order", "getOrders"],
  PRODUCTS: ["order", "getOrderProducts"],
  REVENUE: ["order", "getRevenue"],
  USER: ["order", "getUserOrders"],
} as const
