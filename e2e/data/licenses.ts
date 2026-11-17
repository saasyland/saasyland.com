import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { LICENSE_STATUS, LICENSE_TIER } from "../../src/modules/license/license.constants"

const PARALLEL_WORKERS = 8
const UUID_NODE_DIGITS = 12

export const TEST_LICENSED_ACCOUNT = {
  email: "licensed@example.test",
  id: "test-licensed",
  name: "Test Licensee",
  role: ROLE_CODES.CUSTOMER,
} as const

export const TEST_LICENSE = {
  activation: { createdAt: "2025-01-01T12:00:00.000Z", id: "3f8e2a91-6c4d-4b7e-a2f5-9d1c8e7b6a40", label: "Development laptop" },
  id: "test-license",
  key: "SAASY-TEST-0000-0001",
  polarCustomerId: "cus_test-licensed",
  polarLicenseKeyId: "lk_test-licensed",
  polarOrderId: "ord_test-licensed",
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.CORE,
  user: TEST_LICENSED_ACCOUNT,
} as const

const cliTestLicense = (parallelIndex: number) => {
  const id = `test-cli-${String(parallelIndex)}`

  return {
    activation: { ...TEST_LICENSE.activation, id: `00000000-0000-4000-8000-${String(parallelIndex).padStart(UUID_NODE_DIGITS, "0")}` },
    id: `${id}-license`,
    key: `SAASY-TEST-CLI-${String(parallelIndex)}`,
    polarCustomerId: `cus_${id}`,
    polarLicenseKeyId: `lk_${id}`,
    polarOrderId: `ord_${id}`,
    status: LICENSE_STATUS.ACTIVE,
    tier: LICENSE_TIER.CORE,
    user: { email: `${id}@example.test`, id, name: `Test CLI Licensee ${String(parallelIndex)}`, role: ROLE_CODES.CUSTOMER },
  } as const
}

export const TEST_CLI_LICENSES = Array.from({ length: PARALLEL_WORKERS }, (_, parallelIndex) => cliTestLicense(parallelIndex))

export const TEST_LICENSES = [TEST_LICENSE, ...TEST_CLI_LICENSES]

export const TEST_UNLICENSED_ORDER = {
  customerId: "cus_test-unlicensed",
  id: "ord_test-unlicensed",
  placedAt: "2026-11-16T09:30:00.000Z",
  tier: LICENSE_TIER.AGENCY,
} as const

export const TEST_CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"

export const TEST_BUNDLE = {
  fixture: "e2e/fixtures/bundle",
  version: "0.1.0",
} as const
