import { QueryClient } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createTranslator } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { FIRST_USE, LICENSE_TIER, REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"
import { type getWithdrawalContract, withdrawalContractQuery } from "~/src/modules/withdrawal/use-cases/get-withdrawal-contract"
import type { submitWithdrawalMutation } from "~/src/modules/withdrawal/use-cases/submit-withdrawal"
import { WITHDRAWAL_MUTATION_KEYS, WITHDRAWAL_QUERY_KEYS } from "~/src/modules/withdrawal/withdrawal.constants"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"

import { REFUND_TERMS } from "~/src/data/refunds"

import { WithdrawalCard } from "~/src/presentation/components/custom/app/withdrawal-card"

import authDatesMessages from "~/messages/en-US/auth.dates.json"
import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import pageMessages from "~/messages/en-US/pages.withdrawal.json"

const contractMock = vi.hoisted(() => vi.fn<() => ReturnType<typeof getWithdrawalContract>>())
const submitMock = vi.hoisted(() => vi.fn<NonNullable<typeof submitWithdrawalMutation.mutationFn>>())

vi.mock(import("~/src/modules/withdrawal/use-cases/get-withdrawal-contract"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, withdrawalContractQuery: { ...actual.withdrawalContractQuery, queryFn: contractMock } }
})
vi.mock(import("~/src/modules/withdrawal/use-cases/submit-withdrawal"), () => ({
  submitWithdrawalMutation: { mutationFn: submitMock, mutationKey: WITHDRAWAL_MUTATION_KEYS.SUBMIT },
}))

const messages = getTestMessages("en-US")
const { card, form, receipt } = pageMessages
const PURCHASED_AT = new Date("2026-11-10T09:30:00.000Z")
const UNTIL = new Date("2026-11-24T09:30:00.000Z")
const DELIVERED_AT = new Date("2026-11-11T16:20:00.000Z")
const RECEIVED_AT = new Date("2026-11-12T12:00:00.000Z")

const t = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: pageMessages, timeZone: I18N.DEFAULT_TIMEZONE })
const dates = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: authDatesMessages, timeZone: I18N.DEFAULT_TIMEZONE })
const dateTime = (value: Date): string => dates("dateTime", { value })

const contract = (overrides: Partial<Withdrawal["contract"]> = {}): Withdrawal["contract"] => ({
  eligibility: { kind: REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL, until: UNTIL },
  email: "ada@example.test",
  name: "Ada Buyer",
  purchasedAt: PURCHASED_AT,
  receivedAt: undefined,
  reference: "SAASY-0042",
  tier: LICENSE_TIER.CORE,
  ...overrides,
})

const renderCard = (value: Withdrawal["contract"] | undefined) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(withdrawalContractQuery.queryKey, { contract: value })
  const view = renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={messages} timeZone={I18N.DEFAULT_TIMEZONE}>
      <WithdrawalCard />
    </IntlProvider>,
    { queryClient },
  )
  return { ...view, user: userEvent.setup({ delay: null }) }
}

const contractLine = t("card.contract", { date: dateTime(PURCHASED_AT), reference: "SAASY-0042", tier: pricingMessages.tiers.core.name })

beforeEach(() => {
  contractMock.mockReset().mockResolvedValue({ contract: undefined })
  submitMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("withdrawal card", () => {
  it.each([
    {
      eligibility: { kind: REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL, until: UNTIL },
      text: t("card.terms.statutoryWithdrawal", { date: dateTime(UNTIL) }),
    },
    { eligibility: { kind: REFUND_ELIGIBILITY.REFUNDABLE, until: UNTIL }, text: t("card.terms.refundable", { date: dateTime(UNTIL) }) },
    {
      eligibility: { kind: REFUND_ELIGIBILITY.USED, usedAt: DELIVERED_AT, via: FIRST_USE.TEMPLATES },
      text: t("card.terms.used", { date: dateTime(DELIVERED_AT), via: FIRST_USE.TEMPLATES }),
    },

    {
      eligibility: { endedAt: UNTIL, kind: REFUND_ELIGIBILITY.EXPIRED },
      text: t("card.terms.expired", { date: dateTime(UNTIL), days: REFUND_TERMS.WITHDRAWAL_DAYS }),
    },
  ] as const)("names the purchase and says what a withdrawal does now: $eligibility.kind", ({ eligibility, text }) => {
    renderCard(contract({ eligibility }))

    const heading = screen.getByRole("heading", { level: 2, name: card.title })
    const shown = heading.closest<HTMLElement>("[data-slot=card]")
    if (shown === null) {
      throw new Error("The withdrawal heading is outside a card")
    }
    expect(within(shown).getByText(contractLine)).toBeTruthy()
    expect(within(shown).getByText(text)).toBeTruthy()
    expect(within(shown).getByRole("button", { name: card.open })).toHaveTextContent("Withdraw from contract here")
    expect(within(shown).queryByRole("status")).toBeNull()
  })

  it("says that opening a paid lesson was the first use of the purchase", () => {
    renderCard(contract({ eligibility: { kind: REFUND_ELIGIBILITY.USED, usedAt: DELIVERED_AT, via: FIRST_USE.LESSON } }))

    expect(
      screen.getByText(
        "You asked for immediate supply at checkout, so the right of withdrawal ended when your licence key was issued, and you first used the purchase on Nov 11, 2026, 4:20 PM UTC, when you opened a paid lesson. You can still send a withdrawal statement, and we will reply.",
      ),
    ).toBeTruthy()
  })

  it("opens the statement with the account's details, sends it and then says when it was received", async () => {
    submitMock.mockResolvedValue({
      acknowledged: true,
      email: "ada@example.test",
      name: "Ada Buyer",
      reference: "SAASY-0042",
      submittedAt: RECEIVED_AT,
    })
    contractMock.mockResolvedValue({ contract: contract({ receivedAt: RECEIVED_AT }) })
    const { queryClient, user } = renderCard(contract())
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    await user.click(screen.getByRole("button", { name: card.open }))
    const dialog = await screen.findByRole("dialog", { name: form.title })
    expect(within(dialog).getByText(contractLine)).toBeTruthy()
    expect(within(dialog).getByRole("textbox", { name: form.name })).toHaveValue("Ada Buyer")
    expect(within(dialog).getByRole("textbox", { name: form.email })).toHaveValue("ada@example.test")
    expect(within(dialog).getByRole("textbox", { name: form.reference })).toHaveValue("SAASY-0042")
    await user.click(within(dialog).getByRole("button", { name: form.confirm }))

    expect(await within(dialog).findByRole("heading", { level: 3, name: receipt.title })).toBeTruthy()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: WITHDRAWAL_QUERY_KEYS.ALL })
    await waitFor(() => {
      expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(t("card.received", { submittedAt: dateTime(RECEIVED_AT) }))
    })
  })

  it("shows nothing without an active licence to withdraw from", () => {
    const { container } = renderCard(undefined)

    expect(container).toBeEmptyDOMElement()
  })
})
