import { toMinorUnits } from "../../src/data/currencies"
import { TEST_CATEGORY, TEST_PRODUCTS } from "./products"
import { type TestSeed, literal } from "./seed"

export const productsSeed = (): Promise<TestSeed> =>
  Promise.resolve({
    objects: [],
    statements: [
      ...TEST_PRODUCTS.map(
        ({ billingCycle, currency, description, id, name, price, status, type }) =>
          `INSERT INTO product (id, name, description, price_cents, currency, type, status, billing_cycle) VALUES (${literal(id)}, ${literal(name)}, ${literal(description)}, ${String(toMinorUnits(price, currency))}, ${literal(currency)}, ${literal(type)}, ${literal(status)}, ${literal(billingCycle)}) ON CONFLICT(id) DO UPDATE SET price_cents = excluded.price_cents, currency = excluded.currency, status = excluded.status;`,
      ),
      `INSERT INTO category (id, name, description, kind, visibility) VALUES (${literal(TEST_CATEGORY.id)}, ${literal(TEST_CATEGORY.name)}, ${literal(TEST_CATEGORY.description)}, ${literal(TEST_CATEGORY.kind)}, ${literal(TEST_CATEGORY.visibility)}) ON CONFLICT(id) DO NOTHING;`,
    ],
  })
