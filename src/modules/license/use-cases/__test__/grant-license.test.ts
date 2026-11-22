import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createPolarOrder } from "~/src/platform/testing/mocks/polar"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "grant-owner"
const PURCHASED_AT = "2026-09-24T10:00:00.000Z"
const REPURCHASED_AT = "2026-10-30T08:15:00.000Z"
const FIRST_ACTIVATION = new Date("2026-09-24T10:05:00.000Z")
const FIRST_DOWNLOAD = new Date("2026-09-24T10:06:00.000Z")
const FIRST_LESSON = new Date("2026-09-24T10:07:00.000Z")
const OPENED_LESSON_ID = "lesson-1"
const purchase = {
  polarCustomerId: "cus_1",
  polarOrderId: "ord_1",
  purchaseCreatedAt: new Date(PURCHASED_AT),
  tier: LICENSE_TIER.COMPLETE,
  userId: USER_ID,
  withdrawalConsentAt: undefined,
} as const

beforeEach(async () => {
  await db.delete(license)
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

  it("records the buyer's consent with the purchase and keeps every record when the same order arrives again", async () => {
    await grantLicense({ ...purchase, withdrawalConsentAt: new Date(PURCHASED_AT) })
    await db
      .update(license)
      .set({ activatedAt: FIRST_ACTIVATION, deliveredAt: FIRST_DOWNLOAD, lessonOpenedAt: FIRST_LESSON, openedLessonId: OPENED_LESSON_ID })

    await grantLicense({ ...purchase, withdrawalConsentAt: new Date(PURCHASED_AT) })

    expect(await getLicense(USER_ID)).toMatchObject({
      activatedAt: FIRST_ACTIVATION,
      deliveredAt: FIRST_DOWNLOAD,
      lessonOpenedAt: FIRST_LESSON,
      openedLessonId: OPENED_LESSON_ID,
      withdrawalConsentAt: new Date(PURCHASED_AT),
    })
  })

  it("records a purchase without consent as such", async () => {
    await grantLicense(purchase)

    expect(await getLicense(USER_ID)).toMatchObject({
      activatedAt: null,
      deliveredAt: null,
      lessonOpenedAt: null,
      openedLessonId: null,
      withdrawalConsentAt: null,
    })
  })

  it("starts the records again for a new order, so they describe the current purchase", async () => {
    await grantLicense(purchase)
    await db.update(license).set({
      activatedAt: FIRST_ACTIVATION,
      deliveredAt: FIRST_DOWNLOAD,
      lessonOpenedAt: FIRST_LESSON,
      openedLessonId: OPENED_LESSON_ID,
      status: LICENSE_STATUS.REFUNDED,
    })

    await grantLicense({
      ...purchase,
      polarOrderId: "ord_2",
      purchaseCreatedAt: new Date(REPURCHASED_AT),
      withdrawalConsentAt: new Date(REPURCHASED_AT),
    })

    expect(await getLicense(USER_ID)).toMatchObject({
      activatedAt: null,
      deliveredAt: null,
      lessonOpenedAt: null,
      openedLessonId: null,
      polarOrderId: "ord_2",
      purchaseCreatedAt: new Date(REPURCHASED_AT),
      status: LICENSE_STATUS.ACTIVE,
      withdrawalConsentAt: new Date(REPURCHASED_AT),
    })
  })

  it("forgets the consent of the previous purchase when the new order carries none", async () => {
    await grantLicense({ ...purchase, withdrawalConsentAt: new Date(PURCHASED_AT) })

    await grantLicense({ ...purchase, polarOrderId: "ord_2", purchaseCreatedAt: new Date(REPURCHASED_AT) })

    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "ord_2", withdrawalConsentAt: null })
  })

  it("replaces a legacy license without an order", async () => {
    await db.insert(license).values({ id: "legacy", polarCustomerId: "cus_1", tier: LICENSE_TIER.CORE, userId: USER_ID })
    await grantLicense(purchase)
    expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "ord_1", tier: LICENSE_TIER.COMPLETE })
  })

  it("fetches the true purchase date of a migrated license from Polar before comparing an older event", async () => {
    const migrated = createPolarOrder(
      { externalCustomerId: USER_ID, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.COMPLETE] },
      { created_at: PURCHASED_AT },
    )
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
