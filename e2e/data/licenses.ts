import { LICENSE_STATUS, LICENSE_TIER } from "../../src/modules/license/license.constants"

export const TEST_LICENSE = {
  activation: { createdAt: "2025-01-01T12:00:00.000Z", id: "3f8e2a91-6c4d-4b7e-a2f5-9d1c8e7b6a40", label: "Development laptop" },
  id: "test-license",
  key: "SAASY-TEST-0000-0001",
  polarCustomerId: "cus_test-licensed",
  polarLicenseKeyId: "lk_test-licensed",
  polarOrderId: "ord_test-licensed",
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.CORE,
} as const

export const TEST_CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
