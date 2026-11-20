import { MILLISECONDS_PER_DAY } from "../../src/lib/duration"
import { TEST_REVENUE_CUSTOMER_ID, TEST_REVENUE_ORDERS, TEST_REVENUE_PRODUCT_ID } from "./payments"
import { type TestSeed, literal } from "./seed"

export const paymentsSeed = (): Promise<TestSeed> => {
  const now = Date.now()

  return Promise.resolve({
    objects: [],
    statements: TEST_REVENUE_ORDERS.map(({ currency, daysAgo, id, refundedAmount, status, totalAmount }) => {
      const placed = String(now - daysAgo * MILLISECONDS_PER_DAY)

      return `INSERT INTO "order" (id, customer_id, product_id, status, currency, total_amount, refunded_amount, description, placed_at, changed_at) VALUES (${literal(id)}, ${literal(TEST_REVENUE_CUSTOMER_ID)}, ${literal(TEST_REVENUE_PRODUCT_ID)}, ${literal(status)}, ${literal(currency)}, ${String(totalAmount)}, ${String(refundedAmount)}, ${literal(id)}, ${placed}, ${placed}) ON CONFLICT(id) DO UPDATE SET placed_at = excluded.placed_at, changed_at = excluded.changed_at;`
    }),
  })
}
