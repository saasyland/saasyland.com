export const ORDER_MIRROR_DETAILS = [
  "placedAt",
  "changedAt",
  "product",
  "total",
  "refunded",
  "discount",
  "discountAmount",
  "billingCountry",
  "invoiceNumber",
  "subscription",
  "customerId",
] as const

export const REVENUE_SUMMARY = ["net", "orders", "refunded"] as const

export const ORDER_POLAR_AMOUNTS = ["subtotal", "discount", "net", "tax", "total", "refunded", "refundedTax"] as const

export const ORDER_POLAR_DETAILS = ["status", "discountName", "billingName", "billingCountry", "customerName", "customerEmail"] as const

export const CUSTOMER_COLUMN_SIZES = {
  customer: 248,
  emailVerified: 176,
  lastOrderAt: 216,
  machines: 168,
  orders: 160,
  revenue: 240,
  signedUpAt: 200,
} as const

export const ORDER_COLUMN_SIZES = {
  country: 136,
  customer: 216,
  discount: 200,
  placedAt: 232,
  product: 168,
  refundedAmount: 152,
  status: 148,
  totalAmount: 136,
} as const
