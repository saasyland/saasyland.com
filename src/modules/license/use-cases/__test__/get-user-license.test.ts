import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { FIRST_USE, LICENSE_STATUS, LICENSE_TIER, REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"
import { user } from "~/src/modules/user/user.schema"

import { REFUND_TERMS } from "~/src/data/refunds"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"

const ADMIN_USER_ID = "01900000-0000-7000-8000-000000000011"
const BUYER_ID = "01900000-0000-7000-8000-000000000012"
const NON_BUYER_ID = "01900000-0000-7000-8000-000000000013"
const PURCHASED_AT = new Date("2026-11-10T09:30:00.000Z")
const ACTIVATED_AT = new Date("2026-11-10T09:45:00.000Z")
const DELIVERED_AT = new Date("2026-11-10T09:50:00.000Z")
const LESSON_OPENED_AT = new Date("2026-11-10T09:40:00.000Z")
const SERVER_NOW = new Date("2026-11-12T12:00:00.000Z")
const PERIOD_END = new Date(PURCHASED_AT.getTime() + REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY)

const RECORDED_PURCHASE = {
  activatedAt: ACTIVATED_AT,
  deliveredAt: null,
  lessonOpenedAt: null,
  openedLessonId: null,
  purchaseCreatedAt: PURCHASED_AT,
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.COMPLETE,
  withdrawalConsentAt: PURCHASED_AT,
}

beforeEach(async () => {
  vi.useFakeTimers({ now: SERVER_NOW, toFake: ["Date"] })
  await db.delete(license)
  await db.delete(user)
  await db.insert(user).values([
    { email: "admin@example.test", id: ADMIN_USER_ID, name: "Admin", role: ROLE_CODES.ADMIN },
    { email: "buyer@example.test", id: BUYER_ID, name: "Buyer", role: ROLE_CODES.CUSTOMER },
    { email: "visitor@example.test", id: NON_BUYER_ID, name: "Visitor", role: ROLE_CODES.CUSTOMER },
  ])
  await db
    .insert(license)
    .values({ ...RECORDED_PURCHASE, id: "buyer-license", key: "buyer-key", polarCustomerId: "cus_buyer", userId: BUYER_ID })
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_USER_ID }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("get-user-license", () => {
  it("shows an administrator the buyer's records and whether a refund is possible at the server's time", async () => {
    await expect(executeQuery(userLicenseQuery({ userId: BUYER_ID }))).resolves.toStrictEqual({
      license: { ...RECORDED_PURCHASE, refund: { kind: REFUND_ELIGIBILITY.REFUNDABLE, until: PERIOD_END } },
    })
  })

  it("reports the licence as used once the CLI downloaded templates after the buyer's consent", async () => {
    await db.update(license).set({ deliveredAt: DELIVERED_AT })

    await expect(executeQuery(userLicenseQuery({ userId: BUYER_ID }))).resolves.toMatchObject({
      license: { deliveredAt: DELIVERED_AT, refund: { kind: REFUND_ELIGIBILITY.USED, usedAt: DELIVERED_AT, via: FIRST_USE.TEMPLATES } },
    })
  })

  it("reports the licence as used from the first paid lesson when it was opened before any template download", async () => {
    await db.update(license).set({ deliveredAt: DELIVERED_AT, lessonOpenedAt: LESSON_OPENED_AT, openedLessonId: "lesson-1" })

    await expect(executeQuery(userLicenseQuery({ userId: BUYER_ID }))).resolves.toStrictEqual({
      license: {
        ...RECORDED_PURCHASE,
        deliveredAt: DELIVERED_AT,
        lessonOpenedAt: LESSON_OPENED_AT,
        openedLessonId: "lesson-1",
        refund: { kind: REFUND_ELIGIBILITY.USED, usedAt: LESSON_OPENED_AT, via: FIRST_USE.LESSON },
      },
    })
  })

  it.each([LICENSE_STATUS.REFUNDED, LICENSE_STATUS.REVOKED])("leaves out the refund terms of a %s licence", async (status) => {
    await db.update(license).set({ status })

    await expect(executeQuery(userLicenseQuery({ userId: BUYER_ID }))).resolves.toStrictEqual({
      license: { ...RECORDED_PURCHASE, refund: undefined, status },
    })
  })

  it("returns a defined empty result for an account without a licence", async () => {
    await expect(executeQuery(userLicenseQuery({ userId: NON_BUYER_ID }))).resolves.toStrictEqual({ license: undefined })
  })

  it("caches each user's licence under its own key", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })

    await queryClient.query(userLicenseQuery({ userId: BUYER_ID }))
    await queryClient.query(userLicenseQuery({ userId: NON_BUYER_ID }))

    expect(queryClient.getQueryData(userLicenseQuery({ userId: BUYER_ID }).queryKey)).toMatchObject({
      license: { tier: LICENSE_TIER.COMPLETE },
    })
    expect(queryClient.getQueryData(userLicenseQuery({ userId: NON_BUYER_ID }).queryKey)).toStrictEqual({ license: undefined })
  })

  it("rejects a caller without the permission to read users", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: BUYER_ID }))

    await expect(executeQuery(userLicenseQuery({ userId: BUYER_ID }))).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(userLicenseQuery({ userId: BUYER_ID }))).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
