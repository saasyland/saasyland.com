import { join } from "node:path"

import { bundleObjectKey } from "../../src/modules/license/license.bundles"
import { BUNDLE_BINDING, BUNDLE_CONTENT_TYPE } from "../../src/modules/license/license.constants"
import { accountStatements, userStatement } from "./auth.seed"
import { TEST_BUNDLE, TEST_CLI_LICENSES, TEST_LICENSED_ACCOUNT, TEST_LICENSES } from "./licenses"
import { type TestSeed, literal } from "./seed"

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
  ],
})
