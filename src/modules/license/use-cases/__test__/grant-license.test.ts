import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER } from "~/src/integrations/polar/__test__/fixtures/order"
import { polar } from "~/src/integrations/polar/polar.config"

import { license } from "~/src/modules/license/license.schema"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "grant-owner"
const purchase = {
  polarCustomerId: "cus_1",
  polarOrderId: "ord_1",
  purchaseCreatedAt: POLAR_ORDER.createdAt,
  tier: "complete",
  userId: USER_ID,
} as const

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: "grant@example.test", id: USER_ID, name: "Buyer" })
})
afterEach(() => vi.restoreAllMocks())

describe("grant-license", () => {
  it("records a purchase and preserves its attached key on repeated delivery", async () => {
    await grantLicense(purchase)
    await db.update(license).set({ key: "license-key", polarLicenseKeyId: "lk_1" })
    await grantLicense(purchase)
    expect(await getLicense(USER_ID)).toMatchObject({ key: "license-key", polarLicenseKeyId: "lk_1", tier: "complete" })
  })

  it("replaces a legacy license without an order", async () => {
    await db.insert(license).values({ id: "legacy", polarCustomerId: "cus_1", tier: "core", userId: USER_ID })
    await grantLicense(purchase)
    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "ord_1", tier: "complete" })
  })

  it("fetches the true purchase date for migrated licenses before comparing an older event", async () => {
    await db.insert(license).values({ id: "legacy", polarCustomerId: "cus_1", polarOrderId: "ord_1", tier: "complete", userId: USER_ID })
    const fetchOrder = vi.spyOn(polar.orders, "get").mockResolvedValue(POLAR_ORDER)
    await grantLicense({ ...purchase, polarOrderId: "older", purchaseCreatedAt: new Date("2026-09-23T10:00:00Z"), tier: "core" })
    expect(fetchOrder).toHaveBeenCalledWith({ id: "ord_1" })
    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "ord_1", purchaseCreatedAt: POLAR_ORDER.createdAt, tier: "complete" })
  })
})
