import { MILLISECONDS_PER_DAY } from "../../src/lib/duration"
import { userStatement } from "./auth.seed"
import {
  TEST_BUYER_ORDERS,
  TEST_ORDER_DISCOUNT,
  TEST_ORDER_BUYER,
  TEST_ORDER_BUYER_CUSTOMER_ID,
  TEST_REVENUE_CUSTOMER_ID,
  TEST_REVENUE_ORDERS,
  TEST_REVENUE_PRODUCT_ID,
  TEST_REVENUE_PRODUCT_NAME,
} from "./payments"
import { type TestSeed, literal } from "./seed"

interface SeededTerms {
  readonly country: string
  readonly discountAmount: number
  readonly discounted: boolean
}

interface SeededOrder {
  readonly currency: string
  readonly customerId: string
  readonly daysAgo: number
  readonly description: string
  readonly id: string
  readonly productId: string
  readonly refundedAmount: number
  readonly status: string
  readonly terms: SeededTerms | undefined
  readonly totalAmount: number
  readonly userId: string | undefined
}

const NO_TERMS = "NULL, NULL, NULL, NULL, NULL"

const NO_DISCOUNT = ["NULL", "NULL", "NULL"] as const

const discountColumns = (discounted: boolean): readonly string[] => {
  if (!discounted) {
    return NO_DISCOUNT
  }

  return [literal(TEST_ORDER_DISCOUNT.id), literal(TEST_ORDER_DISCOUNT.code), literal(TEST_ORDER_DISCOUNT.name)]
}

const termsColumns = (terms: SeededTerms | undefined): string => {
  if (terms === undefined) {
    return NO_TERMS
  }

  return [literal(terms.country), String(terms.discountAmount), ...discountColumns(terms.discounted)].join(", ")
}

const orderStatement = (now: number, order: SeededOrder): string => {
  const placed = String(now - order.daysAgo * MILLISECONDS_PER_DAY)
  const userId = order.userId === undefined ? "NULL" : literal(order.userId)

  return `INSERT INTO "order" (id, customer_id, product_id, status, currency, total_amount, refunded_amount, description, placed_at, changed_at, user_id, billing_country, discount_amount, discount_id, discount_code, discount_name) VALUES (${literal(order.id)}, ${literal(order.customerId)}, ${literal(order.productId)}, ${literal(order.status)}, ${literal(order.currency)}, ${String(order.totalAmount)}, ${String(order.refundedAmount)}, ${literal(order.description)}, ${placed}, ${placed}, ${userId}, ${termsColumns(order.terms)}) ON CONFLICT(id) DO UPDATE SET placed_at = excluded.placed_at, changed_at = excluded.changed_at, description = excluded.description, user_id = excluded.user_id, billing_country = excluded.billing_country, discount_amount = excluded.discount_amount, discount_id = excluded.discount_id, discount_code = excluded.discount_code, discount_name = excluded.discount_name;`
}

export const paymentsSeed = (): Promise<TestSeed> => {
  const now = Date.now()

  return Promise.resolve({
    objects: [],
    statements: [
      userStatement(TEST_ORDER_BUYER),
      ...TEST_REVENUE_ORDERS.map((order) =>
        orderStatement(now, {
          ...order,
          customerId: TEST_REVENUE_CUSTOMER_ID,
          description: TEST_REVENUE_PRODUCT_NAME,
          productId: TEST_REVENUE_PRODUCT_ID,
          terms: undefined,
          userId: undefined,
        }),
      ),
      ...TEST_BUYER_ORDERS.map(({ country, discountAmount, discounted, product, ...order }) =>
        orderStatement(now, {
          ...order,
          customerId: TEST_ORDER_BUYER_CUSTOMER_ID,
          description: product.name,
          productId: product.id,
          terms: { country, discountAmount, discounted },
          userId: TEST_ORDER_BUYER.id,
        }),
      ),
    ],
  })
}
