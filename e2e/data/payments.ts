import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"

export const TEST_REVENUE_CUSTOMER_ID = "cus_test-revenue"

export const TEST_REVENUE_PRODUCT_ID = "prod_test-revenue"

export const TEST_REVENUE_PRODUCT_NAME = "Test revenue product"

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

export const TEST_ORDER_BUYER = {
  email: "orders-buyer@example.test",
  id: "test-orders-buyer",
  name: "Test Orders Buyer",
  role: ROLE_CODES.CUSTOMER,
} as const

export const TEST_ORDER_BUYER_CUSTOMER_ID = "cus_test-orders-buyer"

export const TEST_ORDER_PRODUCTS = {
  STARTER: { id: "prod_test-orders-starter", name: "Test Orders Starter", price: { amount: 14_900, currency: "usd" }, recurringInterval: null },
  TEAM: { id: "prod_test-orders-team", name: "Test Orders Team", price: { amount: 29_900, currency: "usd" }, recurringInterval: null },
} as const

export const TEST_ORDER_DISCOUNT = { basisPoints: 1000, code: "E2E10", name: "Test launch discount" } as const

export const TEST_ORDER_BILLING = { country: "DE", countryName: "Germany", name: "Test Orders GmbH" } as const

export const TEST_BUYER_ORDERS = [
  {
    currency: "usd",
    daysAgo: 3,
    discountAmount: 1656,
    discounted: true,
    id: "ord_test-buyer-paid",
    product: TEST_ORDER_PRODUCTS.STARTER,
    refundedAmount: 0,
    status: POLAR_ORDER_STATUS.PAID,
    totalAmount: 14_900,
  },
  {
    currency: "usd",
    daysAgo: 6,
    discountAmount: 0,
    discounted: false,
    id: "ord_test-buyer-refunded",
    product: TEST_ORDER_PRODUCTS.TEAM,
    refundedAmount: 29_900,
    status: POLAR_ORDER_STATUS.REFUNDED,
    totalAmount: 29_900,
  },
  {
    currency: "jpy",
    daysAgo: 40,
    discountAmount: 0,
    discounted: false,
    id: "ord_test-buyer-partly-refunded",
    product: TEST_ORDER_PRODUCTS.TEAM,
    refundedAmount: 5000,
    status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
    totalAmount: 30_000,
  },
] as const

export const TEST_BUYER_SHOWN = {
  discount: "Test launch discount (E2E10)",
  paidOrderTotal: "$149.00",
  revenue: ["¥25,000", "$149.00"],
} as const
