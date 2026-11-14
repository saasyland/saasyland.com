import { afterEach, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import * as licenses from "~/src/modules/license/use-cases/get-license"

const session = createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER })
const ownedLicense = {
  createdAt: new Date(),
  id: "owned",
  key: "key",
  polarCustomerId: "customer",
  polarLicenseKeyId: "polar-license",
  polarOrderId: null,
  purchaseCreatedAt: new Date(0),
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.CORE,
  updatedAt: new Date(),
  userId: session.user.id,
} satisfies NonNullable<Awaited<ReturnType<typeof licenses.getLicense>>>
afterEach(() => vi.restoreAllMocks())
it("loads only the authenticated customer's license", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  const get = vi.spyOn(licenses, "getLicense").mockResolvedValue(ownedLicense)
  expect(await executeQuery(currentLicenseQuery)).toEqual({ license: ownedLicense })
  expect(get).toHaveBeenCalledWith(session.user.id)
})
it("returns a defined empty result for an account without a license", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue(undefined)
  expect(await executeQuery(currentLicenseQuery)).toEqual({ license: undefined })
})
it("rejects a signed-out caller before querying a license", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(null)
  const get = vi.spyOn(licenses, "getLicense")
  await expect(executeQuery(currentLicenseQuery)).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  expect(get).not.toHaveBeenCalled()
})
