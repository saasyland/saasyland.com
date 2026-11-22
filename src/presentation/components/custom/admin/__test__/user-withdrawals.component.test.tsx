import { render, screen, within } from "@testing-library/react"
import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { userWithdrawalsQuery } from "~/src/modules/withdrawal/use-cases/get-user-withdrawals"
import { WITHDRAWAL_CHANNEL, WITHDRAWAL_ELIGIBILITY } from "~/src/modules/withdrawal/withdrawal.constants"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"

import { REFUND_TERMS } from "~/src/data/refunds"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { UserWithdrawalsPending } from "~/src/presentation/components/custom/admin/license-pending"
import { UserWithdrawals } from "~/src/presentation/components/custom/admin/users/user-withdrawals"

import commonMessages from "~/messages/en-US/common.json"
import labels from "~/messages/en-US/pages.admin.users.license.json"

const USER_ID = "grace"
const RECEIVED_AT = new Date("2026-11-12T12:00:00.000Z")
const ACKNOWLEDGED_AT = new Date("2026-11-12T12:00:04.000Z")

const t = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: labels.withdrawals, timeZone: I18N.DEFAULT_TIMEZONE })
const common = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: commonMessages, timeZone: I18N.DEFAULT_TIMEZONE })
const dateTime = (value: Date): string => common("dateTime", { value })

const statement = (overrides: Partial<Withdrawal["userRow"]> = {}): Withdrawal["userRow"] => ({
  acknowledgedAt: ACKNOWLEDGED_AT,
  channel: WITHDRAWAL_CHANNEL.PUBLIC,
  createdAt: RECEIVED_AT,
  eligibility: WITHDRAWAL_ELIGIBILITY.REFUNDABLE,
  email: "grace@example.test",
  id: "statement-1",
  name: "Grace Hopper",
  reference: "SAASY-0042",
  ...overrides,
})

const renderCard = (rows: Withdrawal["userRow"][]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(userWithdrawalsQuery({ userId: USER_ID }).queryKey, { rows })
  return renderAdmin(<UserWithdrawals userId={USER_ID} />, { queryClient })
}

const card = async (): Promise<HTMLElement> => {
  const heading = await screen.findByRole("heading", { level: 2, name: labels.withdrawals.title })
  const container = heading.closest<HTMLElement>("[data-slot=card]")
  if (container === null) {
    throw new Error("The withdrawals heading is outside a card")
  }
  return container
}

const detailsOf = (item: HTMLElement): Record<string, string | null> =>
  Object.fromEntries(
    within(item)
      .getAllByRole("term")
      .map((term) => [term.textContent, term.nextElementSibling?.textContent ?? null]),
  )

describe("admin withdrawal statements", () => {
  it("lists each statement with what the buyer gave, how they were identified, the terms then and the acknowledgement", async () => {
    renderCard([
      statement(),
      statement({ acknowledgedAt: null, channel: WITHDRAWAL_CHANNEL.ACCOUNT, eligibility: WITHDRAWAL_ELIGIBILITY.USED, id: "statement-2" }),
    ])

    const items = within(await card()).getAllByRole("listitem")
    expect(items).toHaveLength(2)
    const [first, second] = items
    if (first === undefined || second === undefined) {
      throw new Error("Two statements were expected")
    }
    const received = t("received", { date: dateTime(RECEIVED_AT) })
    expect(within(first).getByText(received)).toBeTruthy()
    expect(detailsOf(first)).toStrictEqual({
      [labels.withdrawals.details.name]: "Grace Hopper",
      [labels.withdrawals.details.email]: "grace@example.test",
      [labels.withdrawals.details.reference]: "SAASY-0042",
      [labels.withdrawals.details.channel]: labels.withdrawals.channel.public,
      [labels.withdrawals.details.eligibility]: t("eligibility.refundable", { days: REFUND_TERMS.WITHDRAWAL_DAYS }),
      [labels.withdrawals.details.acknowledgement]: t("acknowledgement.sent", { date: dateTime(ACKNOWLEDGED_AT) }),
    })
    expect(detailsOf(second)).toMatchObject({
      [labels.withdrawals.details.channel]: labels.withdrawals.channel.account,
      [labels.withdrawals.details.eligibility]: labels.withdrawals.eligibility.used,
      [labels.withdrawals.details.acknowledgement]: labels.withdrawals.acknowledgement.notSent,
    })
  })

  it("says so when the account has sent no statement", async () => {
    renderCard([])

    expect(within(await card()).getByText(labels.withdrawals.none)).toBeTruthy()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("draws the card's heading and one line while it loads", () => {
    const { container } = render(<UserWithdrawalsPending />)

    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(2)
  })
})
