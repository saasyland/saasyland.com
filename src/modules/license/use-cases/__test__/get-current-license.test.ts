import { afterEach, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { currentLicenseKeyQuery } from "~/src/modules/license/use-cases/get-current-license-key"
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
afterEach(() => vi.restoreAllMocks())
it("loads only the authenticated customer's license, without its key", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  const get = vi.spyOn(licenses, "getLicense").mockResolvedValue(ownedLicense)
  const { key: _key, ...withoutKey } = ownedLicense
  expect(await executeQuery(currentLicenseQuery)).toStrictEqual({ license: withoutKey })
  expect(get).toHaveBeenCalledWith(session.user.id)
})
it("gives the key to a customer whose email is confirmed", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue(ownedLicense)
  expect(await executeQuery(currentLicenseKeyQuery)).toStrictEqual({ key: ownedLicense.key })
})
it("withholds the key, without reading the licence, until the customer confirms their email", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue({ ...session, user: { ...session.user, emailVerified: false } })
  const get = vi.spyOn(licenses, "getLicense").mockResolvedValue(ownedLicense)
  expect(await executeQuery(currentLicenseKeyQuery)).toStrictEqual({ key: undefined })
  expect(get).not.toHaveBeenCalled()
})
it("has no key for a confirmed customer without a licence", async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(licenses, "getLicense").mockResolvedValue(undefined)
  expect(await executeQuery(currentLicenseKeyQuery)).toStrictEqual({ key: undefined })
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
  await expect(executeQuery(currentLicenseKeyQuery)).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  expect(get).not.toHaveBeenCalled()
})
