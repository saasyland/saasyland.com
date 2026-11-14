import { afterEach, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"
import { activatePolarLicenseKey, createPolarOrder, grantPolarLicenseKey, polarLicenseKeyOf } from "~/src/platform/testing/mocks/polar"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { licenseActivationsQuery } from "~/src/modules/license/use-cases/get-current-license-activations"
import * as licenses from "~/src/modules/license/use-cases/get-license"

const ACTIVATION_LIMIT = 3
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
it("returns no activations for an account without a license", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue(undefined)
  expect(await executeQuery(licenseActivationsQuery)).toEqual({ activations: [], limitActivations: 0 })
})
it("does not call Polar before a license key is attached", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue({ ...ownedLicense, polarLicenseKeyId: "" })
  const polarRequests = vi.spyOn(globalThis, "fetch")
  expect(await executeQuery(licenseActivationsQuery)).toEqual({ activations: [], limitActivations: 0 })
  expect(polarRequests).not.toHaveBeenCalled()
})
it("fetches the activations and limit of the owned Polar license key", async () => {
  const order = createPolarOrder({ externalCustomerId: session.user.id, tier: LICENSE_TIER.CORE })
  const grant = grantPolarLicenseKey(order, ACTIVATION_LIMIT)
  const activation = activatePolarLicenseKey(grant, "Laptop")
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue({ ...ownedLicense, polarLicenseKeyId: polarLicenseKeyOf(grant).id })
  expect(await executeQuery(licenseActivationsQuery)).toEqual({ activations: [activation], limitActivations: ACTIVATION_LIMIT })
})
it("rejects a signed-out caller before querying a license", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(null)
  const get = vi.spyOn(licenses, "getLicense")
  await expect(executeQuery(licenseActivationsQuery)).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  expect(get).not.toHaveBeenCalled()
})
