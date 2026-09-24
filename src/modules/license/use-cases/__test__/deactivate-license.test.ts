import { env } from "cloudflare:workers"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { license } from "~/src/modules/license/license.schema"
import { deactivateLicenseMutation } from "~/src/modules/license/use-cases/deactivate-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "01900000-0000-7000-8000-00000000000a"
const ACTIVATION_ID = "01900000-0000-7000-8000-00000000000b"
const KEY = "SAASY-1111"

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: "deactivate@example.test", id: USER_ID, name: "Buyer" })
  await db.insert(license).values({ id: "owned", key: KEY, polarCustomerId: "cus_1", tier: "core", userId: USER_ID })
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: "customer", userId: USER_ID }))
  vi.spyOn(polar.licenseKeys, "deactivate").mockResolvedValue()
})
afterEach(() => vi.restoreAllMocks())

describe("deactivate-license", () => {
  it("frees the slot using the caller's own key", async () => {
    await expect(executeMutation(deactivateLicenseMutation, { activationId: ACTIVATION_ID })).resolves.toMatchObject({ deactivated: true })
    const deactivate = vi.spyOn(polar.licenseKeys, "deactivate")
    expect(deactivate).toHaveBeenCalledWith({ activationId: ACTIVATION_ID, key: KEY, organizationId: env.POLAR_ORGANIZATION_ID })
  })

  it("refuses a caller whose license has no key yet", async () => {
    await db.update(license).set({ key: null })
    await expect(executeMutation(deactivateLicenseMutation, { activationId: ACTIVATION_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    const deactivate = vi.spyOn(polar.licenseKeys, "deactivate")
    expect(deactivate).not.toHaveBeenCalled()
  })

  it("refuses a caller who owns no license", async () => {
    await db.delete(license)
    await expect(executeMutation(deactivateLicenseMutation, { activationId: ACTIVATION_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("refuses a caller with no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    await expect(executeMutation(deactivateLicenseMutation, { activationId: ACTIVATION_ID })).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
    const deactivate = vi.spyOn(polar.licenseKeys, "deactivate")
    expect(deactivate).not.toHaveBeenCalled()
  })
})
