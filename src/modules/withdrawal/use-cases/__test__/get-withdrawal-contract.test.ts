import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_TIER, REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { order } from "~/src/modules/order/order.schema"
import {
  PURCHASED_AT,
  WITHDRAWAL_LICENSES,
  WITHDRAWAL_ORDERS,
  WITHDRAWAL_USERS,
  seedWithdrawalBuyers,
} from "~/src/modules/withdrawal/__test__/fixtures/withdrawal"
import { withdrawalContractQuery } from "~/src/modules/withdrawal/use-cases/get-withdrawal-contract"
import { WITHDRAWAL_CHANNEL, WITHDRAWAL_ELIGIBILITY } from "~/src/modules/withdrawal/withdrawal.constants"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"

import { REFUND_TERMS } from "~/src/data/refunds"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"

const SERVER_NOW = new Date("2026-11-12T12:00:00.000Z")
const PERIOD_END = new Date(PURCHASED_AT.getTime() + REFUND_TERMS.WITHDRAWAL_DAYS * MILLISECONDS_PER_DAY)

const signInAs = (userId: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId }))
}

const statementFor = (licenseId: string | undefined, polarOrderId: string) => ({
  channel: WITHDRAWAL_CHANNEL.ACCOUNT,
  eligibility: WITHDRAWAL_ELIGIBILITY.REFUNDABLE,
  email: "buyer@example.test",
  id: crypto.randomUUID(),
  licenseId,
  locale: "en-US" as const,
  name: "Ada Buyer",
  polarOrderId,
  reference: WITHDRAWAL_ORDERS.BUYER.invoiceNumber,
  userId: WITHDRAWAL_USERS.BUYER.id,
})

beforeEach(async () => {
  vi.useFakeTimers({ now: SERVER_NOW, toFake: ["Date"] })
  await seedWithdrawalBuyers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("get-withdrawal-contract", () => {
  it("names the signed-in buyer's active licence by its invoice number, with their details and its terms at the server's time", async () => {
    signInAs(WITHDRAWAL_USERS.BUYER.id)

    await expect(executeQuery(withdrawalContractQuery)).resolves.toStrictEqual({
      contract: {
        eligibility: { kind: REFUND_ELIGIBILITY.REFUNDABLE, until: PERIOD_END },
        email: "test@example.com",
        name: "Test User",
        purchasedAt: PURCHASED_AT,
        receivedAt: undefined,
        reference: WITHDRAWAL_ORDERS.BUYER.invoiceNumber,
        tier: LICENSE_TIER.COMPLETE,
      },
    })
  })

  it("names the licence by its Polar order ID while the site holds no copy of the order", async () => {
    signInAs(WITHDRAWAL_USERS.NO_CONSENT.id)

    await expect(executeQuery(withdrawalContractQuery)).resolves.toMatchObject({
      contract: { eligibility: { kind: REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL }, reference: WITHDRAWAL_ORDERS.NO_CONSENT.id },
    })
  })

  it("says when the latest statement for the licence's current order arrived, and ignores others", async () => {
    signInAs(WITHDRAWAL_USERS.BUYER.id)
    await db
      .insert(withdrawal)
      .values([statementFor(undefined, WITHDRAWAL_ORDERS.BUYER.id), statementFor(WITHDRAWAL_LICENSES.BUYER, "ord_earlier")])

    await expect(executeQuery(withdrawalContractQuery)).resolves.toMatchObject({ contract: { receivedAt: undefined } })

    await db.insert(withdrawal).values(statementFor(WITHDRAWAL_LICENSES.BUYER, WITHDRAWAL_ORDERS.BUYER.id))
    const [received] = await db
      .select({ createdAt: withdrawal.createdAt })
      .from(withdrawal)
      .where(eq(withdrawal.polarOrderId, WITHDRAWAL_ORDERS.BUYER.id))

    await expect(executeQuery(withdrawalContractQuery)).resolves.toMatchObject({ contract: { receivedAt: received?.createdAt } })
  })

  it("has no contract for an account without an active licence", async () => {
    signInAs(WITHDRAWAL_USERS.REFUNDED.id)
    await expect(executeQuery(withdrawalContractQuery)).resolves.toStrictEqual({ contract: undefined })

    signInAs(WITHDRAWAL_USERS.VISITOR.id)
    await expect(executeQuery(withdrawalContractQuery)).resolves.toStrictEqual({ contract: undefined })
  })

  it("is for signed-in accounts only", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeQuery(withdrawalContractQuery)).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  })

  it("keeps the order copy and the licence apart: a copy for another order does not rename the licence", async () => {
    signInAs(WITHDRAWAL_USERS.BUYER.id)
    await db.update(license).set({ polarOrderId: "ord_upgrade" }).where(eq(license.id, WITHDRAWAL_LICENSES.BUYER))

    await expect(executeQuery(withdrawalContractQuery)).resolves.toMatchObject({ contract: { reference: "ord_upgrade" } })
    expect(await db.select({ id: order.id }).from(order)).toHaveLength(1)
  })
})
