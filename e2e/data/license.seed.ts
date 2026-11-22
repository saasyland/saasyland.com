import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { gunzipSync } from "node:zlib"

import { TIER_PRICES } from "../../src/data/marketing"
import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { sha256Hex } from "../../src/lib/hex"
import { toMinorUnits } from "../../src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "../../src/modules/_core/constants/pricing"
import { bundleObjectKey } from "../../src/modules/license/license.bundles"
import { BUNDLE_BINDING, BUNDLE_CONTENT_TYPE, BUNDLE_METADATA } from "../../src/modules/license/license.constants"
import { accountStatements, userStatement } from "./auth.seed"
import { TEST_LESSONS } from "./courses"
import {
  TEST_BUNDLE,
  TEST_CLI_LICENSES,
  TEST_COURSE_LEARNER,
  TEST_LICENSED_ACCOUNT,
  TEST_LICENSES,
  TEST_MACHINES_LICENSE,
  TEST_TIER_LICENSES,
  TEST_UNLICENSED_ORDER,
} from "./licenses"
import { TEST_PRODUCT_IDS } from "./polar-settings"
import { type TestSeed, literal } from "./seed"

const [, , paidLesson] = TEST_LESSONS

const machinesLessonStatement = (): string => {
  const { id, lessonOpenedAt } = TEST_MACHINES_LICENSE

  return `UPDATE license SET lesson_opened_at = ${String(Date.parse(lessonOpenedAt))}, opened_lesson_id = ${literal(paidLesson.id)} WHERE id = ${literal(id)};`
}

const unlicensedOrderStatement = (): string => {
  const { customerId, id, placedAt, tier } = TEST_UNLICENSED_ORDER
  const placed = String(Date.parse(placedAt))
  const total = String(toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE))

  return `INSERT INTO "order" (id, customer_id, product_id, status, currency, total_amount, refunded_amount, description, placed_at, changed_at) VALUES (${literal(id)}, ${literal(customerId)}, ${literal(TEST_PRODUCT_IDS[tier])}, ${literal(POLAR_ORDER_STATUS.PAID)}, ${literal(DEFAULT_CURRENCY_CODE.toLowerCase())}, ${total}, 0, ${literal(tier)}, ${placed}, ${placed}) ON CONFLICT(id) DO NOTHING;`
}

const machinesOrderStatement = (): string => {
  const { order, polarCustomerId, tier, user } = TEST_MACHINES_LICENSE
  const placed = String(Date.parse(order.placedAt))
  const total = String(toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE))

  return `INSERT INTO "order" (id, customer_id, product_id, status, currency, total_amount, refunded_amount, description, placed_at, changed_at, user_id, discount_amount) VALUES (${literal(order.id)}, ${literal(polarCustomerId)}, ${literal(TEST_PRODUCT_IDS[tier])}, ${literal(POLAR_ORDER_STATUS.PAID)}, ${literal(DEFAULT_CURRENCY_CODE.toLowerCase())}, ${total}, 0, ${literal(tier)}, ${placed}, ${placed}, ${literal(user.id)}, 0) ON CONFLICT(id) DO NOTHING;`
}

export const licenseSeed = async (): Promise<TestSeed> => {
  const bundleKey = bundleObjectKey(TEST_BUNDLE.version)
  const file = join(TEST_BUNDLE.fixture, bundleKey)
  const digest = await sha256Hex(gunzipSync(await readFile(file)).toString())

  return {
    objects: [
      { binding: BUNDLE_BINDING, file, key: bundleKey, metadata: { [BUNDLE_METADATA.SHA256]: digest }, type: BUNDLE_CONTENT_TYPE },
    ],
    statements: [
      ...(await accountStatements([TEST_LICENSED_ACCOUNT, TEST_COURSE_LEARNER])),
      ...[...TEST_CLI_LICENSES, ...TEST_TIER_LICENSES, TEST_MACHINES_LICENSE].map(({ user }) => userStatement(user)),
      ...[...TEST_LICENSES, ...TEST_TIER_LICENSES, TEST_MACHINES_LICENSE].map(
        ({ id, key, polarCustomerId, polarLicenseKeyId, polarOrderId, status, tier, user }) =>
          `INSERT INTO license (id, user_id, tier, status, polar_customer_id, polar_order_id, polar_license_key_id, key) VALUES (${literal(id)}, ${literal(user.id)}, ${literal(tier)}, ${literal(status)}, ${literal(polarCustomerId)}, ${literal(polarOrderId)}, ${literal(polarLicenseKeyId)}, ${literal(key)}) ON CONFLICT(id) DO UPDATE SET status = excluded.status, polar_license_key_id = excluded.polar_license_key_id, key = excluded.key;`,
      ),
      unlicensedOrderStatement(),
      machinesOrderStatement(),
      machinesLessonStatement(),
    ],
  }
}
