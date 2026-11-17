import { join } from "node:path"

import { TIER_PRICES } from "../../src/data/marketing"
import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { toMinorUnits } from "../../src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "../../src/modules/_core/constants/pricing"
import { bundleObjectKey } from "../../src/modules/license/license.bundles"
import { BUNDLE_BINDING, BUNDLE_CONTENT_TYPE } from "../../src/modules/license/license.constants"
import { accountStatements, userStatement } from "./auth.seed"
import { TEST_BUNDLE, TEST_CLI_LICENSES, TEST_LICENSED_ACCOUNT, TEST_LICENSES, TEST_UNLICENSED_ORDER } from "./licenses"
import { TEST_PRODUCT_IDS } from "./polar-settings"
import { type TestSeed, literal } from "./seed"

const unlicensedOrderStatement = (): string => {
  const { customerId, id, placedAt, tier } = TEST_UNLICENSED_ORDER
  const placed = String(Date.parse(placedAt))
  const total = String(toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE))

  return `INSERT INTO "order" (id, customer_id, product_id, status, currency, total_amount, refunded_amount, description, placed_at, changed_at) VALUES (${literal(id)}, ${literal(customerId)}, ${literal(TEST_PRODUCT_IDS[tier])}, ${literal(POLAR_ORDER_STATUS.PAID)}, ${literal(DEFAULT_CURRENCY_CODE.toLowerCase())}, ${total}, 0, ${literal(tier)}, ${placed}, ${placed}) ON CONFLICT(id) DO NOTHING;`
}

export const licenseSeed = async (): Promise<TestSeed> => ({
  objects: [
    {
      binding: BUNDLE_BINDING,
      file: join(TEST_BUNDLE.fixture, bundleObjectKey(TEST_BUNDLE.version)),
      key: bundleObjectKey(TEST_BUNDLE.version),
      type: BUNDLE_CONTENT_TYPE,
    },
  ],
  statements: [
    ...(await accountStatements([TEST_LICENSED_ACCOUNT])),
    ...TEST_CLI_LICENSES.map(({ user }) => userStatement(user)),
    ...TEST_LICENSES.map(
      ({ id, key, polarCustomerId, polarLicenseKeyId, polarOrderId, status, tier, user }) =>
        `INSERT INTO license (id, user_id, tier, status, polar_customer_id, polar_order_id, polar_license_key_id, key) VALUES (${literal(id)}, ${literal(user.id)}, ${literal(tier)}, ${literal(status)}, ${literal(polarCustomerId)}, ${literal(polarOrderId)}, ${literal(polarLicenseKeyId)}, ${literal(key)}) ON CONFLICT(id) DO UPDATE SET status = excluded.status, polar_license_key_id = excluded.polar_license_key_id, key = excluded.key;`,
    ),
    unlicensedOrderStatement(),
  ],
})
