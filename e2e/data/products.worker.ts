import { TEST_CATALOGUE, TEST_CATALOGUE_LICENSE_KEYS } from "./products"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

export const PRODUCTS_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.SETUP,
    setup: async () => {
      const polar = await import("../../src/platform/testing/mocks/polar")
      polar.seedPolarCatalogue({ licenseKeyBenefits: TEST_CATALOGUE_LICENSE_KEYS, products: Object.values(TEST_CATALOGUE) })
    },
  },
] as const satisfies readonly TestWorkerEntry[]
