import { POLAR_RECURRING_INTERVAL } from "../../src/integrations/polar/polar.constants"

export const TEST_BILLING_PRODUCTS = {
  KIT: { id: "prod_test-billing-kit", name: "Test Billing Kit", price: { amount: 4900, currency: "usd" }, recurringInterval: null },
  PLAN: {
    id: "prod_test-billing-plan",
    name: "Test Billing Plan",
    price: { amount: 1900, currency: "usd" },
    recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
  },
} as const

export const TEST_BILLING_SHOWN = {
  kitTotal: "$49.00",
  planPrice: "$19.00 a month",
} as const
