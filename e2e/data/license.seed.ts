import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { gunzipSync } from "node:zlib"

import { bundleObjectKey } from "../../src/modules/license/license.bundles"
import { BUNDLE_BINDING, BUNDLE_CONTENT_TYPE, BUNDLE_METADATA } from "../../src/modules/license/license.constants"
import { accountStatements } from "./auth.seed"
import { TEST_BUNDLE, TEST_LICENSE, TEST_LICENSED_ACCOUNT } from "./licenses"
import { type TestSeed, literal } from "./seed"

export const licenseSeed = async (): Promise<TestSeed> => {
  const key = bundleObjectKey(TEST_BUNDLE.version)
  const file = join(TEST_BUNDLE.fixture, key)
  const digest = createHash("sha256")
    .update(gunzipSync(await readFile(file)))
    .digest("hex")

  return {
    objects: [{ binding: BUNDLE_BINDING, file, key, metadata: { [BUNDLE_METADATA.SHA256]: digest }, type: BUNDLE_CONTENT_TYPE }],
    statements: [
      ...(await accountStatements([TEST_LICENSED_ACCOUNT])),
      `INSERT INTO license (id, user_id, tier, status, polar_customer_id, polar_order_id, polar_license_key_id, key) VALUES (${literal(TEST_LICENSE.id)}, ${literal(TEST_LICENSED_ACCOUNT.id)}, ${literal(TEST_LICENSE.tier)}, ${literal(TEST_LICENSE.status)}, ${literal(TEST_LICENSE.polarCustomerId)}, ${literal(TEST_LICENSE.polarOrderId)}, ${literal(TEST_LICENSE.polarLicenseKeyId)}, ${literal(TEST_LICENSE.key)}) ON CONFLICT(id) DO UPDATE SET status = excluded.status, polar_license_key_id = excluded.polar_license_key_id, key = excluded.key;`,
    ],
  }
}
