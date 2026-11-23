import { PLATFORM } from "@saasyland/stack/api"

import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { LICENSE_STATUS, LICENSE_TIER, type LicenseStatus, type LicenseTier } from "../../src/modules/license/license.constants"

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

export const TEST_COURSE_LEARNER = {
  email: "learner@example.test",
  id: "test-learner",
  name: "Test Learner",
  role: ROLE_CODES.CUSTOMER,
} as const

export const TEST_COURSE_LICENSE = {
  ...TEST_LICENSE,
  activation: { ...TEST_LICENSE.activation, id: "6a2d1f80-9b3c-4e5f-8a7b-1c2d3e4f5a60" },
  id: "test-course-license",
  key: "SAASY-TEST-0000-0002",
  polarCustomerId: "cus_test-learner",
  polarLicenseKeyId: "lk_test-learner",
  polarOrderId: "ord_test-learner",
  tier: LICENSE_TIER.COMPLETE,
  user: TEST_COURSE_LEARNER,
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

export const TEST_LICENSES = [TEST_LICENSE, TEST_COURSE_LICENSE, ...TEST_CLI_LICENSES]

export const TEST_MACHINES_LICENSE = {
  activations: [
    { createdAt: "2026-11-01T10:00:00.000Z", id: "7c1e4b2a-3d5f-4a6b-8c9d-0e1f2a3b4c50", label: "Studio Mac", platform: PLATFORM.MACOS },
    { createdAt: "2026-11-05T10:00:00.000Z", id: "7c1e4b2a-3d5f-4a6b-8c9d-0e1f2a3b4c51", label: "Release runner", platform: PLATFORM.LINUX },
  ],
  id: "test-machines-license",
  key: "SAASY-TEST-MACHINES",
  lessonOpenedAt: "2026-11-02T10:00:00.000Z",
  order: { id: "ord_test-machines", placedAt: "2026-11-01T09:00:00.000Z" },
  polarCustomerId: "cus_test-machines",
  polarLicenseKeyId: "lk_test-machines",
  polarOrderId: "ord_test-machines",
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.COMPLETE,
  user: { email: "machines@example.test", id: "test-machines", name: "Test Machines Licensee", role: ROLE_CODES.CUSTOMER },
} as const

const tierTestLicense = (tier: LicenseTier, status: LicenseStatus) => {
  const id = `test-${tier}-${status}`

  return {
    id: `${id}-license`,
    key: `SAASY-TEST-${tier.toUpperCase()}-${status.toUpperCase()}`,
    polarCustomerId: `cus_${id}`,
    polarLicenseKeyId: `lk_${id}`,
    polarOrderId: `ord_${id}`,
    status,
    tier,
    user: { email: `${id}@example.test`, id, name: `Test ${tier} ${status} licensee`, role: ROLE_CODES.CUSTOMER },
  } as const
}

export const TEST_TIER_LICENSES = [
  tierTestLicense(LICENSE_TIER.AGENCY, LICENSE_STATUS.ACTIVE),
  tierTestLicense(LICENSE_TIER.AGENCY, LICENSE_STATUS.REFUNDED),
  tierTestLicense(LICENSE_TIER.AGENCY, LICENSE_STATUS.REVOKED),
  tierTestLicense(LICENSE_TIER.COMPLETE, LICENSE_STATUS.REFUNDED),
  tierTestLicense(LICENSE_TIER.CORE, LICENSE_STATUS.REVOKED),
] as const

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
