import { afterEach, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { POLAR_LICENSE_KEY } from "~/src/integrations/polar/__test__/fixtures/license-key"
import { polar } from "~/src/integrations/polar/polar.config"

import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { currentLicenseQuery, licenseActivationsQuery } from "~/src/modules/license/use-cases/get-current-license"
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
  expect(await executeQuery(licenseActivationsQuery)).toEqual({ activations: [], limitActivations: 0 })
})
it("does not call Polar before a license key is attached", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue({ ...ownedLicense, polarLicenseKeyId: "" })
  const fetch = vi.spyOn(polar.licenseKeys, "get")
  expect(await executeQuery(licenseActivationsQuery)).toEqual({ activations: [], limitActivations: 0 })
  expect(fetch).not.toHaveBeenCalled()
})
it("fetches activations for the owned Polar license", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue(ownedLicense)
  const fetch = vi.spyOn(polar.licenseKeys, "get").mockResolvedValue({ ...POLAR_LICENSE_KEY, limit_activations: 3 })
  expect(await executeQuery(licenseActivationsQuery)).toEqual({ activations: [], limitActivations: 3 })
  expect(fetch).toHaveBeenCalledWith("polar-license")
})
it("rejects a signed-out caller before querying a license", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(null)
  const get = vi.spyOn(licenses, "getLicense")
  await expect(executeQuery(currentLicenseQuery)).rejects.toThrow("UNAUTHORIZED")
  expect(get).not.toHaveBeenCalled()
})
