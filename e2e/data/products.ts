import {
  POLAR_ORDER_STATUS,
  POLAR_PRODUCT_VISIBILITY,
  POLAR_RECURRING_INTERVAL,
} from "../../src/integrations/polar/polar.constants"

export const TEST_CATALOGUE_SEARCH = "Test catalogue"

export const TEST_CATALOGUE_CUSTOMER_ID = "cus_test-catalogue"

export const TEST_CATALOGUE_ORDERS_DAYS_AGO = 400

export const TEST_CATALOGUE = {
  ARCHIVE: {
    id: "prod_test-catalogue-archive",
    isArchived: true,
    name: "Test catalogue archive",
    price: { amount: 4900, currency: "jpy" },
    recurringInterval: null,
  },
  KIT: {
    description: "The kit the browser suite sells",
    id: "prod_test-catalogue-kit",
    name: "Test catalogue kit",
    price: { amount: 4900, currency: "usd" },
    recurringInterval: null,
  },
  PLAN: {
    id: "prod_test-catalogue-plan",
    name: "Test catalogue plan",
    price: { amount: 1200, currency: "usd" },
    recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
    visibility: POLAR_PRODUCT_VISIBILITY.PRIVATE,
  },
} as const

export const TEST_CATALOGUE_LICENSE_KEYS = [
  { activationLimit: 5, id: "benefit_test-catalogue-kit", prefix: "KIT", products: [TEST_CATALOGUE.KIT] },
  { activationLimit: null, id: "benefit_test-catalogue-plan", prefix: "PLAN", products: [TEST_CATALOGUE.PLAN] },
] as const

export const TEST_CATALOGUE_ORDERS = [
  {
    currency: "usd",
    id: "ord_test-catalogue-kit-paid",
    product: TEST_CATALOGUE.KIT,
    refundedAmount: 0,
    status: POLAR_ORDER_STATUS.PAID,
    totalAmount: 4900,
  },
  {
    currency: "usd",
    id: "ord_test-catalogue-kit-partly-refunded",
    product: TEST_CATALOGUE.KIT,
    refundedAmount: 900,
    status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
    totalAmount: 4900,
  },
  {
    currency: "eur",
    id: "ord_test-catalogue-plan-paid",
    product: TEST_CATALOGUE.PLAN,
    refundedAmount: 0,
    status: POLAR_ORDER_STATUS.PAID,
    totalAmount: 1100,
  },
  {
    currency: "usd",
    id: "ord_test-catalogue-plan-pending",
    product: TEST_CATALOGUE.PLAN,
    refundedAmount: 0,
    status: POLAR_ORDER_STATUS.PENDING,
    totalAmount: 1200,
  },
] as const

export const TEST_CATALOGUE_SHOWN = {
  ARCHIVE: { price: "¥4,900", sales: "0" },
  KIT: { licenseKey: "Up to 5 machines", price: "$49.00", revenue: "$89.00", sales: "2" },
  PLAN: { price: "$12.00 per month", revenue: "€11.00", sales: "1" },
} as const
