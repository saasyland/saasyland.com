import { MILLISECONDS_PER_DAY } from "../../src/lib/duration"
import { TEST_CATALOGUE_CUSTOMER_ID, TEST_CATALOGUE_ORDERS, TEST_CATALOGUE_ORDERS_DAYS_AGO } from "./products"
import { type TestSeed, literal } from "./seed"

export const productsSeed = (): Promise<TestSeed> => {
  const placed = String(Date.now() - TEST_CATALOGUE_ORDERS_DAYS_AGO * MILLISECONDS_PER_DAY)

  return Promise.resolve({
    objects: [],
    statements: TEST_CATALOGUE_ORDERS.map(
      ({ currency, id, product, refundedAmount, status, totalAmount }) =>
        `INSERT INTO "order" (id, customer_id, product_id, status, currency, total_amount, refunded_amount, description, placed_at, changed_at) VALUES (${literal(id)}, ${literal(TEST_CATALOGUE_CUSTOMER_ID)}, ${literal(product.id)}, ${literal(status)}, ${literal(currency)}, ${String(totalAmount)}, ${String(refundedAmount)}, ${literal(product.name)}, ${placed}, ${placed}) ON CONFLICT(id) DO UPDATE SET status = excluded.status, total_amount = excluded.total_amount, refunded_amount = excluded.refunded_amount, placed_at = excluded.placed_at, changed_at = excluded.changed_at;`,
    ),
  })
}
