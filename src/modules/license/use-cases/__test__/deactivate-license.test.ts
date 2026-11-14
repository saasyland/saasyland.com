import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { activatePolarLicenseKey, createPolarOrder, grantPolarLicenseKey, polarLicenseKeyOf } from "~/src/platform/testing/mocks/polar"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { deactivateLicenseMutation } from "~/src/modules/license/use-cases/deactivate-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "01900000-0000-7000-8000-00000000000a"
const ACTIVATION_LIMIT = 3

const seedLicenseKey = async () => {
  const order = createPolarOrder({ externalCustomerId: USER_ID, tier: LICENSE_TIER.CORE })
  const grant = grantPolarLicenseKey(order, ACTIVATION_LIMIT)
  const { id, key } = polarLicenseKeyOf(grant)
  await db.insert(license).values({
    id: "owned",
    key,
    polarCustomerId: order.customer_id,
    polarLicenseKeyId: id,
    tier: LICENSE_TIER.CORE,
    userId: USER_ID,
  })
  return { activation: activatePolarLicenseKey(grant, "Laptop"), grant }
}

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: "deactivate@example.test", id: USER_ID, name: "Buyer" })
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: USER_ID }))
})
afterEach(() => vi.restoreAllMocks())

describe("deactivate-license", () => {
  it("frees the slot using the caller's own key", async () => {
    const { activation, grant } = await seedLicenseKey()

    await expect(executeMutation(deactivateLicenseMutation, { activationId: activation.id })).resolves.toMatchObject({ deactivated: true })

    expect(polarLicenseKeyOf(grant).activations).toStrictEqual([])
  })

  it("refuses a caller whose license has no key yet", async () => {
    const { activation } = await seedLicenseKey()
    await db.update(license).set({ key: null })
    const polarRequests = vi.spyOn(globalThis, "fetch")

    await expect(executeMutation(deactivateLicenseMutation, { activationId: activation.id })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    expect(polarRequests).not.toHaveBeenCalled()
  })

  it("refuses a caller who owns no license", async () => {
    await expect(executeMutation(deactivateLicenseMutation, { activationId: crypto.randomUUID() })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("refuses a caller with no session", async () => {
    const { activation } = await seedLicenseKey()
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    const polarRequests = vi.spyOn(globalThis, "fetch")

    await expect(executeMutation(deactivateLicenseMutation, { activationId: activation.id })).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
    expect(polarRequests).not.toHaveBeenCalled()
  })
})
