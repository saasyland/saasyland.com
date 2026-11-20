import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"

export const TEST_REVENUE_CUSTOMER_ID = "cus_test-revenue"

export const TEST_REVENUE_PRODUCT_ID = "prod_test-revenue"

export const TEST_REVENUE_ORDERS = [
  { currency: "gbp", daysAgo: 1, id: "ord_test-revenue-paid", refundedAmount: 0, status: POLAR_ORDER_STATUS.PAID, totalAmount: 12_900 },
  {
    currency: "gbp",
    daysAgo: 2,
    id: "ord_test-revenue-partly-refunded",
    refundedAmount: 3900,
    status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
    totalAmount: 8900,
  },
  { currency: "gbp", daysAgo: 2, id: "ord_test-revenue-refunded", refundedAmount: 4900, status: POLAR_ORDER_STATUS.REFUNDED, totalAmount: 4900 },
  { currency: "gbp", daysAgo: 1, id: "ord_test-revenue-pending", refundedAmount: 0, status: POLAR_ORDER_STATUS.PENDING, totalAmount: 50_000 },
  { currency: "eur", daysAgo: 45, id: "ord_test-revenue-older", refundedAmount: 0, status: POLAR_ORDER_STATUS.PAID, totalAmount: 19_900 },
] as const

export const TEST_REVENUE = {
  last30Days: { net: "£179.00", orders: "3", refunded: "£88.00" },
  last12MonthsEuro: { net: "€199.00", orders: "1" },
} as const
