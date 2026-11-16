import { TEST_LICENSES } from "./licenses"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

export const LICENSE_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.SETUP,
    setup: async () => {
      const polar = await import("../../src/platform/testing/mocks/polar")
      const { POLAR_PRODUCT_IDS } = await import("../../src/modules/license/license.utils")
      for (const { activation, key, polarLicenseKeyId, tier, user } of TEST_LICENSES) {
        polar.seedPolarLicenseKey({
          activation,
          externalCustomerId: user.id,
          key,
          licenseKeyId: polarLicenseKeyId,
          productId: POLAR_PRODUCT_IDS[tier],
        })
      }
    },
  },
] as const satisfies readonly TestWorkerEntry[]
