import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { WITHDRAWAL_LICENSES, WITHDRAWAL_USERS, seedWithdrawalBuyers } from "~/src/modules/withdrawal/__test__/fixtures/withdrawal"
import { userWithdrawalsQuery } from "~/src/modules/withdrawal/use-cases/get-user-withdrawals"
import { WITHDRAWAL_CHANNEL, WITHDRAWAL_ELIGIBILITY } from "~/src/modules/withdrawal/withdrawal.constants"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"

const ACKNOWLEDGED_AT = new Date("2026-11-12T12:00:05.000Z")

const FIRST = {
  acknowledgedAt: ACKNOWLEDGED_AT,
  channel: WITHDRAWAL_CHANNEL.PUBLIC,
  eligibility: WITHDRAWAL_ELIGIBILITY.REFUNDABLE,
  email: "buyer@example.test",
  id: "01900000-0000-7000-8000-000000000201",
  licenseId: WITHDRAWAL_LICENSES.BUYER,
  locale: "de-DE",
  name: "Ada Buyer",
  reference: "SAASY-0042",
  userId: WITHDRAWAL_USERS.BUYER.id,
} as const

const SECOND = {
  ...FIRST,
  acknowledgedAt: undefined,
  channel: WITHDRAWAL_CHANNEL.ACCOUNT,
  eligibility: WITHDRAWAL_ELIGIBILITY.USED,
  email: "ada@example.test",
  id: "01900000-0000-7000-8000-000000000202",
  locale: "en-US",
  name: "Ada B.",
} as const

const OTHER_ACCOUNT = {
  ...SECOND,
  eligibility: WITHDRAWAL_ELIGIBILITY.UNMATCHED,
  id: "01900000-0000-7000-8000-000000000203",
  licenseId: undefined,
  userId: WITHDRAWAL_USERS.VISITOR.id,
} as const

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: WITHDRAWAL_USERS.ADMIN.id }))
}

beforeEach(async () => {
  await seedWithdrawalBuyers()
  await db.insert(withdrawal).values([FIRST, SECOND, OTHER_ACCOUNT])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-user-withdrawals", () => {
  it("lists an account's withdrawal statements for an administrator, newest first", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { rows } = await executeQuery(userWithdrawalsQuery({ userId: WITHDRAWAL_USERS.BUYER.id }))

    expect(rows.map(({ id }) => id)).toStrictEqual([SECOND.id, FIRST.id])
    expect(rows[0]).toMatchObject({ acknowledgedAt: null, channel: SECOND.channel, eligibility: SECOND.eligibility, name: SECOND.name })
    expect(rows[1]).toMatchObject({
      acknowledgedAt: ACKNOWLEDGED_AT,
      channel: FIRST.channel,
      eligibility: FIRST.eligibility,
      email: FIRST.email,
      name: FIRST.name,
      reference: FIRST.reference,
    })
    expect(rows[1]?.createdAt).toBeInstanceOf(Date)
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(userWithdrawalsQuery({ userId: WITHDRAWAL_USERS.BUYER.id }))).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})
