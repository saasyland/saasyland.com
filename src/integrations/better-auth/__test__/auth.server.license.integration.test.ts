import { eq } from "drizzle-orm"
import { v7 } from "uuid"
import { describe, expect, it } from "vite-plus/test"

import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import { emailToken, promoteToAdmin, signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { LICENSE_STATUS, LICENSE_TIER, type LicenseStatus } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { user } from "~/src/modules/user/user.schema"
import { WITHDRAWAL_CHANNEL, WITHDRAWAL_ELIGIBILITY } from "~/src/modules/withdrawal/withdrawal.constants"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"

import { ROUTES } from "~/src/routes"

const DELIVERED_AT = new Date("2026-11-02T10:00:00Z")
const LESSON_OPENED_AT = new Date("2026-11-03T10:00:00Z")

const licensedAccount = async (status: LicenseStatus) => {
  const buyer = await signUpAndVerify()
  const licenseId = v7()
  const withdrawalId = v7()
  await db.insert(license).values({
    deliveredAt: DELIVERED_AT,
    id: licenseId,
    key: `KEY-${licenseId}`,
    lessonOpenedAt: LESSON_OPENED_AT,
    openedLessonId: "lesson-1",
    polarCustomerId: `customer-${licenseId}`,
    polarOrderId: `order-${licenseId}`,
    status,
    tier: LICENSE_TIER.COMPLETE,
    userId: buyer.userId,
  })
  await db.insert(withdrawal).values({
    channel: WITHDRAWAL_CHANNEL.ACCOUNT,
    eligibility: WITHDRAWAL_ELIGIBILITY.USED,
    email: buyer.account.email,
    id: withdrawalId,
    licenseId,
    locale: I18N.DEFAULT_LOCALE,
    name: buyer.account.name,
    reference: `order-${licenseId}`,
    userId: buyer.userId,
  })
  return { ...buyer, licenseId, withdrawalId }
}

const keptLicense = async (licenseId: string) => {
  const [row] = await db.select().from(license).where(eq(license.id, licenseId))
  return row
}

const keptWithdrawal = async (withdrawalId: string) => {
  const [row] = await db
    .select({ licenseId: withdrawal.licenseId, userId: withdrawal.userId })
    .from(withdrawal)
    .where(eq(withdrawal.id, withdrawalId))
  return row
}

describe("licence records of a deleted account", () => {
  it("keeps the licence and its delivery records with no account, and revokes it, when the customer deletes the account", async () => {
    const { account, headers, licenseId, userId, withdrawalId } = await licensedAccount(LICENSE_STATUS.ACTIVE)

    await auth.api.deleteUser({ body: { callbackURL: ROUTES.APP.SETTINGS.DELETE_ACCOUNT, password: account.password }, headers })
    await flushWaitUntil()
    await auth.api.deleteUser({ body: { token: emailToken(account.email, ROUTES.APP.SETTINGS.DELETE_ACCOUNT) }, headers })

    expect(await db.select().from(user).where(eq(user.id, userId))).toStrictEqual([])
    expect(await keptLicense(licenseId)).toMatchObject({
      deliveredAt: DELIVERED_AT,
      key: `KEY-${licenseId}`,
      lessonOpenedAt: LESSON_OPENED_AT,
      openedLessonId: "lesson-1",
      polarCustomerId: `customer-${licenseId}`,
      polarOrderId: `order-${licenseId}`,
      status: LICENSE_STATUS.REVOKED,
      userId: null,
    })
    expect(await keptWithdrawal(withdrawalId)).toStrictEqual({ licenseId, userId: null })
  })

  it("keeps a refunded licence refunded, with no account, when an admin deletes the account", async () => {
    const { licenseId, userId } = await licensedAccount(LICENSE_STATUS.REFUNDED)
    const admin = await signUpAndVerify()
    await promoteToAdmin(admin.userId)

    await auth.api.removeUser({ body: { userId }, headers: admin.headers })

    expect(await keptLicense(licenseId)).toMatchObject({ status: LICENSE_STATUS.REFUNDED, userId: null })
  })
})
