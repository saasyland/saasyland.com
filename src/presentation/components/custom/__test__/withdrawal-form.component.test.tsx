import { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { createTranslator } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import type { submitWithdrawalMutation } from "~/src/modules/withdrawal/use-cases/submit-withdrawal"
import { WITHDRAWAL_MUTATION_KEYS, WITHDRAWAL_REFERENCE_MAX_LENGTH } from "~/src/modules/withdrawal/withdrawal.constants"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"

import { REFUND_TERMS } from "~/src/data/refunds"

import { WithdrawalForm, type WithdrawalStatementFields } from "~/src/presentation/components/custom/withdrawal-form"

import commonMessages from "~/messages/en-US/common.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pageMessages from "~/messages/en-US/pages.withdrawal.json"
import validationMessages from "~/messages/en-US/withdrawal.validations.json"

const submitMock = vi.hoisted(() => vi.fn<NonNullable<typeof submitWithdrawalMutation.mutationFn>>())

vi.mock(import("~/src/modules/withdrawal/use-cases/submit-withdrawal"), () => ({
  submitWithdrawalMutation: { mutationFn: submitMock, mutationKey: WITHDRAWAL_MUTATION_KEYS.SUBMIT },
}))

const messages = getTestMessages("en-US")
const { form, receipt } = pageMessages
const SUBMITTED_AT = new Date("2026-11-12T12:00:00.000Z")
const STATEMENT = { email: "ada@example.test", name: "Ada Buyer", reference: "SAASY-0042" }

const t = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: pageMessages, timeZone: I18N.DEFAULT_TIMEZONE })
const common = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: commonMessages, timeZone: I18N.DEFAULT_TIMEZONE })

const receiptOf = (acknowledged: boolean): Withdrawal["receipt"] => ({ ...STATEMENT, acknowledged, submittedAt: SUBMITTED_AT })

const renderForm = (props: { defaultValues?: WithdrawalStatementFields; onSubmitted?: () => Promise<undefined> } = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={messages} timeZone={I18N.DEFAULT_TIMEZONE}>
      <WithdrawalForm {...props} />
    </IntlProvider>,
    { queryClient },
  )
  return userEvent.setup({ delay: null })
}

const field = (label: string): HTMLElement => screen.getByRole("textbox", { name: label })

const fill = async (user: ReturnType<typeof userEvent.setup>, values: typeof STATEMENT): Promise<void> => {
  for (const [label, value] of [
    [form.name, values.name],
    [form.email, values.email],
    [form.reference, values.reference],
  ] as const) {
    await user.click(field(label))
    await user.paste(value)
  }
}

const confirm = (): HTMLElement => screen.getByRole("button", { name: form.confirm })

beforeEach(() => {
  submitMock.mockReset().mockResolvedValue(receiptOf(true))
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("withdrawal form", () => {
  it("states the withdrawal, asks for the name, the address for the acknowledgement and the order, and confirms with the statutory label", () => {
    renderForm()

    expect(screen.getByText(form.statement)).toBeTruthy()
    expect(field(form.name)).toHaveAttribute("autocomplete", "name")
    expect(field(form.email)).toHaveAccessibleDescription(form.emailDescription)
    expect(field(form.reference)).toHaveAccessibleDescription(form.referenceDescription)
    expect(confirm()).toHaveTextContent("Confirm withdrawal")
  })

  it("sends the statement in the page's language and shows the receipt with its content, time and acknowledgement", async () => {
    const user = renderForm()
    await fill(user, STATEMENT)
    await user.click(confirm())

    expect(await screen.findByRole("heading", { level: 3, name: receipt.title })).toHaveFocus()
    expect(submitMock).toHaveBeenCalledExactlyOnceWith({ ...STATEMENT, locale: "en-US" }, expect.anything())
    const submittedAt = common("dateTime", { value: SUBMITTED_AT })
    expect(screen.getByText(t("receipt.submittedAt", { submittedAt }))).toBeTruthy()
    for (const value of Object.values(STATEMENT)) {
      expect(screen.getByText(value, { selector: "dd" })).toBeTruthy()
    }
    expect(screen.getByText(t("receipt.acknowledged", { email: STATEMENT.email }))).toBeTruthy()
    expect(screen.getByText(t("receipt.next", { days: REFUND_TERMS.REIMBURSEMENT_DAYS }))).toBeTruthy()
    expect(screen.queryByRole("button", { name: form.confirm })).toBeNull()
  })

  it("says that the acknowledgement is still to come when it could not be emailed", async () => {
    submitMock.mockResolvedValue(receiptOf(false))
    const user = renderForm({ defaultValues: STATEMENT })
    await user.click(confirm())

    expect(await screen.findByText(t("receipt.unacknowledged", { email: STATEMENT.email }))).toBeTruthy()
  })

  it("starts from the account's details and tells the caller once the statement is in", async () => {
    const submitted = Promise.withResolvers<undefined>()
    const onSubmitted = vi.fn(() => submitted.promise)
    const user = renderForm({ defaultValues: STATEMENT, onSubmitted })

    expect(field(form.name)).toHaveValue(STATEMENT.name)
    expect(field(form.email)).toHaveValue(STATEMENT.email)
    expect(field(form.reference)).toHaveValue(STATEMENT.reference)
    await user.click(confirm())

    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalledOnce()
    })
    await act(async () => {
      submitted.resolve(undefined)
      await submitted.promise
    })
    expect(await screen.findByRole("heading", { level: 3, name: receipt.title })).toBeTruthy()
  })

  it("names every missing or invalid detail and sends nothing", async () => {
    const user = renderForm()
    await user.click(field(form.email))
    await user.paste("ada")
    await user.click(confirm())

    expect(await screen.findByText(validationMessages.nameRequired)).toBeTruthy()
    expect(screen.getByText(validationMessages.emailInvalid)).toBeTruthy()
    expect(screen.getByText(validationMessages.referenceRequired)).toBeTruthy()
    expect(field(form.name)).toHaveFocus()
    expect(submitMock).not.toHaveBeenCalled()
  })

  it("names an order number that is too long", async () => {
    const user = renderForm({ defaultValues: { ...STATEMENT, reference: "x".repeat(WITHDRAWAL_REFERENCE_MAX_LENGTH + 1) } })
    await user.click(confirm())

    expect(
      await screen.findByText(
        createTranslator({ locale: "en-US", messages: validationMessages })("referenceMaxLength", { max: WITHDRAWAL_REFERENCE_MAX_LENGTH }),
      ),
    ).toBeTruthy()
  })

  it("keeps the statement on screen and says why when sending fails", async () => {
    submitMock.mockRejectedValue(new Error(ERROR_CODES.TOO_MANY_REQUESTS))
    const user = renderForm({ defaultValues: STATEMENT })
    await user.click(confirm())

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.TOO_MANY_REQUESTS)
    })
    expect(field(form.name)).toHaveValue(STATEMENT.name)
  })
})
