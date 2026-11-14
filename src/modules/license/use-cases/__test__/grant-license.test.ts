import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createPolarOrder } from "~/src/platform/testing/mocks/polar"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "grant-owner"
const PURCHASED_AT = "2026-09-24T10:00:00.000Z"
const purchase = {
  polarCustomerId: "cus_1",
  polarOrderId: "ord_1",
  purchaseCreatedAt: new Date(PURCHASED_AT),
  tier: LICENSE_TIER.COMPLETE,
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
    expect(await getLicense(USER_ID)).toMatchObject({ key: "license-key", polarLicenseKeyId: "lk_1", tier: LICENSE_TIER.COMPLETE })
  })

  it("replaces a legacy license without an order", async () => {
    await db.insert(license).values({ id: "legacy", polarCustomerId: "cus_1", tier: LICENSE_TIER.CORE, userId: USER_ID })
    await grantLicense(purchase)
    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "ord_1", tier: LICENSE_TIER.COMPLETE })
  })

  it("fetches the true purchase date of a migrated license from Polar before comparing an older event", async () => {
    const migrated = createPolarOrder({ externalCustomerId: USER_ID, tier: LICENSE_TIER.COMPLETE }, { created_at: PURCHASED_AT })
    await db.insert(license).values({
      id: "legacy",
      polarCustomerId: migrated.customer_id,
      polarOrderId: migrated.id,
      tier: LICENSE_TIER.COMPLETE,
      userId: USER_ID,
    })

    await grantLicense({ ...purchase, polarOrderId: "older", purchaseCreatedAt: new Date("2026-09-23T10:00:00Z"), tier: LICENSE_TIER.CORE })

    expect(await getLicense(USER_ID)).toMatchObject({
      polarOrderId: migrated.id,
      purchaseCreatedAt: new Date(PURCHASED_AT),
      tier: LICENSE_TIER.COMPLETE,
    })
  })
})
