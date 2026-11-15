import { TEST_LICENSED_ACCOUNT } from "./accounts"
import { TEST_LICENSE } from "./licenses"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

export const LICENSE_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.SETUP,
    setup: async () => {
      const polar = await import("../../src/platform/testing/mocks/polar")
      polar.seedPolarLicenseKey({
        activation: TEST_LICENSE.activation,
        externalCustomerId: TEST_LICENSED_ACCOUNT.id,
        key: TEST_LICENSE.key,
        licenseKeyId: TEST_LICENSE.polarLicenseKeyId,
        tier: TEST_LICENSE.tier,
      })
    },
  },
] as const satisfies readonly TestWorkerEntry[]
