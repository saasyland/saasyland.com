import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_LICENSE_KEY } from "~/src/integrations/polar/__test__/fixtures/license-key"
import { POLAR_ORDER } from "~/src/integrations/polar/__test__/fixtures/order"
import { polar } from "~/src/integrations/polar/polar.config"

import { attachLicenseKey } from "~/src/modules/license/use-cases/attach-license-key"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "key-owner"
const input = { polarLicenseKeyId: "lk_1", polarOrderId: "ord_1", userId: USER_ID }
const purchase = {
  polarCustomerId: "cus_1",
  polarOrderId: "ord_1",
  purchaseCreatedAt: POLAR_ORDER.createdAt,
  tier: "core",
  userId: USER_ID,
} as const
beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: "key@example.test", id: USER_ID, name: "Buyer" })
  vi.spyOn(polar.licenseKeys, "get").mockResolvedValue(POLAR_LICENSE_KEY)
})
afterEach(() => vi.restoreAllMocks())

describe("attach-license-key", () => {
  it("rejects an early grant and attaches its retry after the order arrives", async () => {
    await expect(attachLicenseKey(input)).rejects.toThrow("The license purchase has not been recorded yet")
    await grantLicense(purchase)
    await attachLicenseKey(input)
    expect(await getLicense(USER_ID)).toMatchObject({ key: POLAR_LICENSE_KEY.key, polarLicenseKeyId: "lk_1" })
  })

  it("waits for a newer order instead of attaching its key to the old purchase", async () => {
    await grantLicense(purchase)
    vi.spyOn(polar.orders, "get").mockResolvedValue({ ...POLAR_ORDER, createdAt: new Date("2026-09-25T10:00:00Z"), id: "newer" })
    await expect(attachLicenseKey({ ...input, polarOrderId: "newer" })).rejects.toThrow("The license purchase has not been recorded yet")
    expect(await getLicense(USER_ID)).toMatchObject({ key: null, polarOrderId: "ord_1" })
  })

  it("ignores older grants and grants for a revoked purchase", async () => {
    await grantLicense(purchase)
    vi.spyOn(polar.orders, "get").mockResolvedValue({ ...POLAR_ORDER, createdAt: new Date("2026-09-23T10:00:00Z"), id: "older" })
    await attachLicenseKey({ ...input, polarOrderId: "older" })
    await revokeLicense({ polarOrderId: "ord_1", userId: USER_ID })
    await attachLicenseKey(input)
    const fetchKey = vi.spyOn(polar.licenseKeys, "get")
    expect(fetchKey).not.toHaveBeenCalled()
    expect(await getLicense(USER_ID)).toMatchObject({ key: null, status: "revoked" })
  })
})
