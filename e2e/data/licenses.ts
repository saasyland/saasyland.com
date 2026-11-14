import { LICENSE_STATUS, LICENSE_TIER } from "../../src/modules/license/license.constants"

export const TEST_LICENSE = {
  activation: { createdAt: "2025-01-01T12:00:00.000Z", id: "lka_test-licensed", label: "Development laptop" },
  id: "test-license",
  key: "SAASY-TEST-0000-0001",
  polarCustomerId: "cus_test-licensed",
  polarLicenseKeyId: "lk_test-licensed",
  polarOrderId: "ord_test-licensed",
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.CORE,
} as const
