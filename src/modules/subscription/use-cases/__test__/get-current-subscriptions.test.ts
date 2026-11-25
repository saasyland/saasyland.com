import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_RECURRING_INTERVAL, POLAR_SUBSCRIPTION_STATUS } from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { subscriptionRow } from "~/src/modules/subscription/__test__/fixtures/subscription"
import { subscription } from "~/src/modules/subscription/subscription.schema"
import { currentSubscriptionsQuery } from "~/src/modules/subscription/use-cases/get-current-subscriptions"
import { user } from "~/src/modules/user/user.schema"

const BUYER_ID = "01900000-0000-7000-8000-000000000051"
const OTHER_BUYER_ID = "01900000-0000-7000-8000-000000000052"

const MONTHLY = subscriptionRow({ currentPeriodEnd: new Date("2026-12-16T10:00:00.000Z"), id: "sub_monthly", userId: BUYER_ID })

const YEARLY_ENDED = subscriptionRow({
  amount: 19_000,
  cancelAtPeriodEnd: true,
  currency: "eur",
  currentPeriodEnd: new Date("2026-05-01T10:00:00.000Z"),
  endedAt: new Date("2026-05-01T10:00:00.000Z"),
  id: "sub_yearly",
  productName: "Yearly plan",
  recurringInterval: POLAR_RECURRING_INTERVAL.YEAR,
  status: POLAR_SUBSCRIPTION_STATUS.CANCELED,
  userId: BUYER_ID,
})

const OTHER = subscriptionRow({ id: "sub_other", userId: OTHER_BUYER_ID })

const signInAs = (userId: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId }))
}

beforeEach(async () => {
  await db.delete(subscription)
  await db.delete(user)
  await db.insert(user).values([
    { email: "ada@example.test", id: BUYER_ID, name: "Ada" },
    { email: "grace@example.test", id: OTHER_BUYER_ID, name: "Grace" },
  ])
  await db.insert(subscription).values([YEARLY_ENDED, OTHER, MONTHLY])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-current-subscriptions", () => {
  it("lists the signed-in account's own subscriptions, the latest period first, with their price per interval", async () => {
    signInAs(BUYER_ID)

    await expect(executeQuery(currentSubscriptionsQuery)).resolves.toStrictEqual({
      subscriptions: [
        {
          cancelAtPeriodEnd: false,
          currentPeriodEnd: MONTHLY.currentPeriodEnd,
          endedAt: JSON_NULL,
          id: MONTHLY.id,
          price: { amount: 29, currency: "USD" },
          productName: MONTHLY.productName,
          recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
          recurringIntervalCount: 1,
          status: POLAR_SUBSCRIPTION_STATUS.ACTIVE,
        },
        {
          cancelAtPeriodEnd: true,
          currentPeriodEnd: YEARLY_ENDED.currentPeriodEnd,
          endedAt: YEARLY_ENDED.endedAt,
          id: YEARLY_ENDED.id,
          price: { amount: 190, currency: "EUR" },
          productName: "Yearly plan",
          recurringInterval: POLAR_RECURRING_INTERVAL.YEAR,
          recurringIntervalCount: 1,
          status: POLAR_SUBSCRIPTION_STATUS.CANCELED,
        },
      ],
    })
  })

  it("refuses a visitor who is not signed in", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(null)

    await expect(executeQuery(currentSubscriptionsQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
