import type { ReactNode } from "react"

import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter as render } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import type * as RequestPasswordResetUseCase from "~/src/modules/verification/use-cases/request-password-reset"
import { RESEND_COOLDOWN_SECONDS, VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

import { ForgotPasswordForm } from "~/src/presentation/components/custom/auth/forgot-password-form"

import authValidationMessages from "~/messages/en-US/auth.validations.json"
import resendMessages from "~/messages/en-US/components.custom.email-link-resend.json"
import pagesAuthForgotPasswordMessages from "~/messages/en-US/pages.auth.forgot-password.json"
import { ROUTES } from "~/src/routes"

const TEST_EMAIL = "user@example.com"

const enMessages = getTestMessages("en-US")

const requestPasswordResetMock = vi.hoisted(() =>
  vi.fn<NonNullable<typeof RequestPasswordResetUseCase.requestPasswordResetMutation.mutationFn>>(),
)
const toastErrorMock = vi.fn()

vi.mock(import("~/src/modules/verification/use-cases/request-password-reset"), () => ({
  requestPasswordResetMutation: { mutationFn: requestPasswordResetMock, mutationKey: VERIFICATION_MUTATION_KEYS.REQUEST_PASSWORD_RESET },
}))

const renderWithAuthMessages = (ui: ReactNode, path = "/") =>
  render(
    <IntlProvider locale="en-US" messages={enMessages}>
      {ui}
    </IntlProvider>,
    { router: createTestRouter(path) },
  )

const expectPending = (button: HTMLElement): void => {
  expect(button).toHaveAttribute("aria-disabled", "true")
  expect(button.querySelector(".animate-spin")).toBeInTheDocument()
}

const setupForgotPasswordFormMocks = (): void => {
  requestPasswordResetMock.mockReset().mockResolvedValue({ sent: true })
  toastErrorMock.mockReset()
}

beforeEach(() => {
  vi.spyOn(toast, "error").mockImplementation(toastErrorMock)
})

afterEach(() => {
  vi.useRealTimers()
})

const sentDescription =
  (email: string) =>
  (_: string, element: Element | null): boolean =>
    element?.tagName === "P" &&
    element.textContent ===
      pagesAuthForgotPasswordMessages.sent.description
        .replace("<address>{email}</address>", email)
        .replace("{hours, plural, one {# hour} other {# hours}}", "1 hour")

describe("forgot password form", () => {
  it("reports an invalid email only once the visitor leaves the field", async () => {
    setupForgotPasswordFormMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<ForgotPasswordForm />)
    const email = screen.getByLabelText(/email/iu)

    await user.type(email, "not-an-email")
    expect(email).toHaveAttribute("aria-invalid", "false")
    expect(screen.queryByText(authValidationMessages.emailInvalid)).not.toBeInTheDocument()

    await user.tab()

    expect(email).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText(authValidationMessages.emailInvalid)).toHaveAttribute("id", "forgot-password-email-error")
    expect(requestPasswordResetMock).not.toHaveBeenCalled()
  })

  it("fills in the address carried from sign-in", () => {
    setupForgotPasswordFormMocks()
    renderWithAuthMessages(<ForgotPasswordForm />, `${ROUTES.AUTH.FORGOT_PASSWORD}?email=${encodeURIComponent(TEST_EMAIL)}`)

    expect(screen.getByLabelText(/email/iu)).toHaveValue(TEST_EMAIL)
  })

  it("allows retry after a failed request and replaces the form with a confirmation naming the address", async () => {
    setupForgotPasswordFormMocks()
    requestPasswordResetMock.mockRejectedValueOnce(new Error("Email delivery failed"))
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<ForgotPasswordForm />)
    const email = screen.getByLabelText(/email/iu)
    const submit = screen.getByTestId("forgot-password-form-submit-button")

    await user.type(email, TEST_EMAIL)
    await user.click(submit)
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledOnce()
    })
    expect(email).toBeEnabled()
    expect(submit).toBeEnabled()

    await user.click(submit)

    expect(await screen.findByText(sentDescription(TEST_EMAIL))).toBeVisible()
    expect(screen.queryByTestId("forgot-password-form-submit-button")).not.toBeInTheDocument()
    expect(requestPasswordResetMock).toHaveBeenCalledTimes(2)
    expect(requestPasswordResetMock).toHaveBeenLastCalledWith(
      { email: TEST_EMAIL, redirectTo: ROUTES.AUTH.RESET_PASSWORD },
      expect.anything(),
    )
  })

  it("keeps the return path in the reset link", async () => {
    setupForgotPasswordFormMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<ForgotPasswordForm />, `${ROUTES.AUTH.FORGOT_PASSWORD}?redirect=%2Fapp%2Flicense`)

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.click(screen.getByTestId("forgot-password-form-submit-button"))

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith(
        { email: TEST_EMAIL, redirectTo: `${ROUTES.AUTH.RESET_PASSWORD}?redirect=%2Fapp%2Flicense` },
        expect.anything(),
      )
    })
  })

  it("resends from the confirmation after a countdown, and says so when the hourly limit stops it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setupForgotPasswordFormMocks()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, delay: null })
    renderWithAuthMessages(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.click(screen.getByTestId("forgot-password-form-submit-button"))

    const resend = await screen.findByRole("button", { name: new RegExp(`^${pagesAuthForgotPasswordMessages.sent.resend}`, "u") })
    expect(screen.getByRole("status")).toHaveTextContent(resendMessages.sentIfAccount.replace("{email}", TEST_EMAIL))
    expect(resend).toBeDisabled()
    expect(resend).toHaveTextContent("1:00")

    requestPasswordResetMock.mockResolvedValueOnce({ retryAfterSeconds: 600, sent: false })
    act(() => {
      vi.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * MILLISECONDS_PER_SECOND)
    })
    expect(resend).toBeEnabled()
    await user.click(resend)

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("We've sent 3 links to this address in the last hour")
    })
    expect(requestPasswordResetMock).toHaveBeenCalledTimes(2)
    expect(requestPasswordResetMock).toHaveBeenLastCalledWith(
      { email: TEST_EMAIL, redirectTo: ROUTES.AUTH.RESET_PASSWORD },
      expect.anything(),
    )
  })

  it("shows the limit instead of a confirmation when no link could be sent", async () => {
    setupForgotPasswordFormMocks()
    requestPasswordResetMock.mockResolvedValueOnce({ retryAfterSeconds: 600, sent: false })
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.click(screen.getByTestId("forgot-password-form-submit-button"))

    expect(await screen.findByRole("status")).toHaveTextContent("We've sent 3 links to this address in the last hour")
  })

  it("goes back to an empty form to use a different email", async () => {
    setupForgotPasswordFormMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.click(screen.getByTestId("forgot-password-form-submit-button"))
    await user.click(await screen.findByRole("button", { name: pagesAuthForgotPasswordMessages.sent.useDifferentEmail }))

    expect(screen.getByLabelText(/email/iu)).toHaveValue("")
    expect(screen.getByLabelText(/email/iu)).toHaveAttribute("aria-invalid", "false")
  })

  it("shows progress and ignores repeat submits until the reset email is requested", async () => {
    setupForgotPasswordFormMocks()
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof requestPasswordResetMock>>>()
    requestPasswordResetMock.mockReturnValueOnce(pending.promise)
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<ForgotPasswordForm />)
    const submit = screen.getByTestId("forgot-password-form-submit-button")

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.click(submit)

    expect(submit).toHaveTextContent(pagesAuthForgotPasswordMessages.form.submitting)
    expectPending(submit)
    await user.click(submit)
    expect(requestPasswordResetMock).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve({ sent: true })
      await pending.promise
    })
    expect(await screen.findByText(sentDescription(TEST_EMAIL))).toBeVisible()
  })
})
