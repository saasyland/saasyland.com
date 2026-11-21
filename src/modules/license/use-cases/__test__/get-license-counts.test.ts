import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_STATUS, LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { licenseCountsQuery } from "~/src/modules/license/use-cases/get-license-counts"
import { user } from "~/src/modules/user/user.schema"

const ADMIN_ID = "01900000-0000-7000-8000-000000000031"

const LICENSES = [
  { status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.CORE },
  { status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.CORE },
  { status: LICENSE_STATUS.REFUNDED, tier: LICENSE_TIER.CORE },
  { status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.AGENCY },
  { status: LICENSE_STATUS.REVOKED, tier: LICENSE_TIER.AGENCY },
  { status: LICENSE_STATUS.REVOKED, tier: LICENSE_TIER.AGENCY },
] as const

const noLicenses = (tier: LicenseTier) => ({
  [LICENSE_STATUS.ACTIVE]: 0,
  [LICENSE_STATUS.REFUNDED]: 0,
  [LICENSE_STATUS.REVOKED]: 0,
  id: tier,
  tier,
})

beforeEach(async () => {
  await db.delete(license)
  await db.delete(user)
  await db.insert(user).values([
    { email: "admin@example.test", id: ADMIN_ID, name: "Admin", role: ROLE_CODES.ADMIN },
    ...LICENSES.map((_, index) => ({
      email: `buyer-${String(index)}@example.test`,
      id: `buyer-${String(index)}`,
      name: `Buyer ${String(index)}`,
      role: ROLE_CODES.CUSTOMER,
    })),
  ])
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_ID }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-license-counts", () => {
  it("counts the licences of every tier by status, in the tiers' order, with zero where a tier has none", async () => {
    await db.insert(license).values(
      LICENSES.map(({ status, tier }, index) => ({
        id: `license-${String(index)}`,
        polarCustomerId: `cus_${String(index)}`,
        status,
        tier,
        userId: `buyer-${String(index)}`,
      })),
    )

    await expect(executeQuery(licenseCountsQuery)).resolves.toStrictEqual({
      rows: [
        { ...noLicenses(LICENSE_TIER.CORE), [LICENSE_STATUS.ACTIVE]: 2, [LICENSE_STATUS.REFUNDED]: 1 },
        noLicenses(LICENSE_TIER.COMPLETE),
        { ...noLicenses(LICENSE_TIER.AGENCY), [LICENSE_STATUS.ACTIVE]: 1, [LICENSE_STATUS.REVOKED]: 2 },
      ],
    })
  })

  it("answers zero for every tier when no licence exists", async () => {
    await expect(executeQuery(licenseCountsQuery)).resolves.toStrictEqual({
      rows: [noLicenses(LICENSE_TIER.CORE), noLicenses(LICENSE_TIER.COMPLETE), noLicenses(LICENSE_TIER.AGENCY)],
    })
  })

  it("rejects a caller without admin access", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: "buyer-0" }))

    await expect(executeQuery(licenseCountsQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(licenseCountsQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
