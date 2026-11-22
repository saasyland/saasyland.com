import { MILLISECONDS_PER_DAY } from "../../src/lib/duration"
import { userStatement } from "./auth.seed"
import {
  TEST_BUYER_ORDERS,
  TEST_ORDER_BUYER,
  TEST_ORDER_BUYER_CUSTOMER_ID,
  TEST_REVENUE_CUSTOMER_ID,
  TEST_REVENUE_ORDERS,
  TEST_REVENUE_PRODUCT_ID,
  TEST_REVENUE_PRODUCT_NAME,
} from "./payments"
import { type TestSeed, literal } from "./seed"

interface SeededOrder {
  readonly currency: string
  readonly customerId: string
  readonly daysAgo: number
  readonly description: string
  readonly id: string
  readonly productId: string
  readonly refundedAmount: number
  readonly status: string
  readonly totalAmount: number
  readonly userId: string | undefined
}

const orderStatement = (now: number, order: SeededOrder): string => {
  const placed = String(now - order.daysAgo * MILLISECONDS_PER_DAY)
  const userId = order.userId === undefined ? "NULL" : literal(order.userId)

  return `INSERT INTO "order" (id, customer_id, product_id, status, currency, total_amount, refunded_amount, description, placed_at, changed_at, user_id) VALUES (${literal(order.id)}, ${literal(order.customerId)}, ${literal(order.productId)}, ${literal(order.status)}, ${literal(order.currency)}, ${String(order.totalAmount)}, ${String(order.refundedAmount)}, ${literal(order.description)}, ${placed}, ${placed}, ${userId}) ON CONFLICT(id) DO UPDATE SET placed_at = excluded.placed_at, changed_at = excluded.changed_at, description = excluded.description, user_id = excluded.user_id;`
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
          userId: undefined,
        }),
      ),
      ...TEST_BUYER_ORDERS.map(({ product, ...order }) =>
        orderStatement(now, {
          ...order,
          customerId: TEST_ORDER_BUYER_CUSTOMER_ID,
          description: product.name,
          productId: product.id,
          userId: TEST_ORDER_BUYER.id,
        }),
      ),
    ],
  })
}
