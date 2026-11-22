import { afterEach, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"
import { activatePolarLicenseKey, createPolarOrder, grantPolarLicenseKey, polarLicenseKeyOf } from "~/src/platform/testing/mocks/polar"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_QUERY_KEYS, LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { licenseActivationsQuery } from "~/src/modules/license/use-cases/get-current-license-activations"
import * as licenses from "~/src/modules/license/use-cases/get-license"

const session = createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER })
const ownedLicense = {
  activatedAt: null,
  createdAt: new Date(),
  deliveredAt: null,
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
  withdrawalConsentAt: null,
} satisfies NonNullable<Awaited<ReturnType<typeof licenses.getLicense>>>
const issuedKey = { polarLicenseKeyId: ownedLicense.polarLicenseKeyId, tier: ownedLicense.tier }
afterEach(() => vi.restoreAllMocks())
it("returns no activations for an account without a license", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue(undefined)
  expect(await executeQuery(licenseActivationsQuery(issuedKey))).toEqual({ activations: [], limitActivations: 0 })
})
it("does not call Polar before a license key is attached", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue({ ...ownedLicense, polarLicenseKeyId: "" })
  const polarRequests = vi.spyOn(globalThis, "fetch")
  expect(await executeQuery(licenseActivationsQuery(issuedKey))).toEqual({ activations: [], limitActivations: 0 })
  expect(polarRequests).not.toHaveBeenCalled()
})
it("fetches the activations and limit of the owned Polar license key", async () => {
  const order = createPolarOrder({ externalCustomerId: session.user.id, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] })
  const grant = grantPolarLicenseKey(order)
  const activation = activatePolarLicenseKey(grant, "Laptop")
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue({ ...ownedLicense, polarLicenseKeyId: polarLicenseKeyOf(grant).id })
  const granted = { ...issuedKey, polarLicenseKeyId: polarLicenseKeyOf(grant).id }
  expect(await executeQuery(licenseActivationsQuery(granted))).toEqual({
    activations: [activation],
    limitActivations: LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE],
  })
})
it("keys the activations by the licence key and its tier, so a key that arrives or an upgrade reads them afresh", () => {
  const keys = [issuedKey, { ...issuedKey, polarLicenseKeyId: "polar-license-2" }, { ...issuedKey, tier: LICENSE_TIER.COMPLETE }].map(
    (issued) => licenseActivationsQuery(issued).queryKey,
  )

  expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(keys.length)
  expect(keys.every((key) => key.join("/").startsWith(LICENSE_QUERY_KEYS.ACTIVATIONS.join("/")))).toBe(true)
})
it("rejects a signed-out caller before querying a license", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(null)
  const get = vi.spyOn(licenses, "getLicense")
  await expect(executeQuery(licenseActivationsQuery(issuedKey))).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  expect(get).not.toHaveBeenCalled()
})
