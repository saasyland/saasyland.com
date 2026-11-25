import { POLAR_ORDER_STATUS, POLAR_WEBHOOK_EVENT } from "~/src/integrations/polar/polar.constants"

import { SECONDS_PER_MINUTE } from "~/src/lib/duration"

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

export const ORDER_WEBHOOK_EVENTS = [
  POLAR_WEBHOOK_EVENT.ORDER_CREATED,
  POLAR_WEBHOOK_EVENT.ORDER_PAID,
  POLAR_WEBHOOK_EVENT.ORDER_REFUNDED,
  POLAR_WEBHOOK_EVENT.ORDER_UPDATED,
] as const

export const ORDER_SORT_COLUMNS = ["placedAt", "totalAmount", "refundedAmount", "status"] as const

export const CUSTOMER_SORT_COLUMNS = ["customer", "orders", "lastOrderAt", "signedUpAt"] as const

export const ORDER_DISCOUNT_FILTER = {
  ANY: "any",
  NONE: "none",
} as const

export const ORDER_DISCOUNT_FILTERS = [ORDER_DISCOUNT_FILTER.ANY, ORDER_DISCOUNT_FILTER.NONE] as const

export const POLAR_READ = {
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
} as const

export const ORDER_CHECKOUT_METADATA = {
  LOCALE: "locale",
} as const

export const CHECKOUT_RATE_LIMIT_KIND = "start-checkout"

export const CHECKOUT_RATE_LIMIT = { max: 10, window: SECONDS_PER_MINUTE } as const

export const ORDER_QUERY_KEYS = {
  ALL: ["order"],
  CUSTOMERS: ["order", "getCustomers"],
  DETAIL: ["order", "getOrder"],
  FILTERS: ["order", "getOrderFilters"],
  LIST: ["order", "getOrders"],
  PRODUCT_SALES: ["order", "getProductSales"],
  REVENUE: ["order", "getRevenue"],
  SEARCH: ["order", "searchOrders"],
  USER: ["order", "getUserOrders"],
} as const

export const ORDER_MUTATION_KEYS = {
  START_CHECKOUT: ["order", "startCheckout"],
} as const
