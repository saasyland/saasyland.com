import { type ReactNode } from "react"

import { BetterFetchError, type ErrorContext, type SuccessContext } from "@better-fetch/fetch"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, render as renderView, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type * as Sonner from "sonner"
import type { ExternalToast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter as render } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import type * as AuthClient from "~/src/integrations/better-auth/auth.client"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type * as SignUpUseCase from "~/src/modules/account/use-cases/sign-up-with-password"
import type * as RequestPasswordResetUseCase from "~/src/modules/verification/use-cases/request-password-reset"
import type * as ResetPasswordUseCase from "~/src/modules/verification/use-cases/reset-password"
import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"

import { Route as ResetPasswordRoute } from "~/src/routes/auth.reset-password"

import { ForgotPasswordForm } from "~/src/presentation/components/custom/auth/forgot-password-form"
import { OAuthButtons } from "~/src/presentation/components/custom/auth/oauth-buttons"
import { SignInForm } from "~/src/presentation/components/custom/auth/sign-in-form"
import { SignUpForm } from "~/src/presentation/components/custom/auth/sign-up-form"

import authErrorsMessages from "~/messages/en-US/auth.errors.json"
import authFormMessages from "~/messages/en-US/auth.form.json"
import authOauthMessages from "~/messages/en-US/auth.oauth.json"
import authValidationMessages from "~/messages/en-US/auth.validations.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesAuthForgotPasswordMessages from "~/messages/en-US/pages.auth.forgot-password.json"
import pagesAuthResetPasswordMessages from "~/messages/en-US/pages.auth.reset-password.json"
import pagesAuthSignInMessages from "~/messages/en-US/pages.auth.sign-in.json"
import pagesAuthSignUpMessages from "~/messages/en-US/pages.auth.sign-up.json"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

type SonnerTitle = (() => ReactNode) | ReactNode
type ToastMethod = (message: SonnerTitle, data?: ExternalToast) => string | number

const TEST_EMAIL = "user@example.com"
const TEST_PASSWORD = "Secret1!"
const TEST_NAME = "Test User"
const RESET_TOKEN = "reset-token-123"

const enMessages = getTestMessages("en-US")

const router = createTestRouter()
const pushMock = vi.spyOn(router, "navigate").mockResolvedValue()
const signInEmailMock = vi.hoisted(() => vi.fn<typeof AuthClient.signIn.email>())
const signUpMock = vi.hoisted(() => vi.fn<NonNullable<typeof SignUpUseCase.signUpWithPasswordMutation.mutationFn>>())
const requestPasswordResetMock = vi.hoisted(() =>
  vi.fn<NonNullable<typeof RequestPasswordResetUseCase.requestPasswordResetMutation.mutationFn>>(),
)
const resetPasswordMock = vi.hoisted(() => vi.fn<NonNullable<typeof ResetPasswordUseCase.resetPasswordMutation.mutationFn>>())
const signInSocialMock = vi.hoisted(() => vi.fn<typeof AuthClient.authClient.signIn.social>())
const toastSuccessMock = vi.hoisted(() => vi.fn<ToastMethod>(() => 0))
const toastErrorMock = vi.hoisted(() => vi.fn<ToastMethod>(() => 0))
const triggerConfettiMock = vi.hoisted(() => vi.fn<() => void>())

const createAuthSuccessContext = (data?: unknown): SuccessContext => ({
  data,
  request: {
    body: undefined,
    headers: new Headers(),
    method: "POST",
    signal: new AbortController().signal,
    url: "http://localhost/api/auth",
  },
  response: new Response(),
})

const invokeFetchOnSuccess = async (
  fetchOptions: { onSuccess?: (context: SuccessContext) => Promise<void> | void } | undefined,
): Promise<void> => {
  await fetchOptions?.onSuccess?.(createAuthSuccessContext())
}

const renderWithAuthMessages = (ui: ReactNode): ReturnType<typeof render> =>
  render(
    <IntlProvider locale="en-US" messages={enMessages}>
      {ui}
    </IntlProvider>,
    { router },
  )

const renderResetPasswordPage = async () => {
  vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {})
  const root = createRootRouteWithContext<RouterContext>()()
  Object.assign(ResetPasswordRoute.options, { getParentRoute: () => root, id: ROUTES.RESET_PASSWORD, path: ROUTES.RESET_PASSWORD })
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const resetRouter = createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [`${ROUTES.RESET_PASSWORD}?token=${RESET_TOKEN}`] }),
    routeTree: root.addChildren([ResetPasswordRoute]),
  })
  renderView(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en-US" messages={enMessages}>
        <RouterProvider router={resetRouter} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => resetRouter.load())
  const navigate = vi.spyOn(resetRouter, "navigate").mockResolvedValue()
  await screen.findByTestId("reset-password-form-submit-button")
  return { navigate }
}

const expectPending = (button: HTMLElement): void => {
  expect(button).toHaveAttribute("aria-disabled", "true")
  expect(button.querySelector(".animate-spin")).toBeInTheDocument()
}

const expectIdle = (button: HTMLElement): void => {
  expect(button).not.toHaveAttribute("aria-disabled")
  expect(button.querySelector(".animate-spin")).not.toBeInTheDocument()
}

const getPasswordInput = (id: string): HTMLInputElement => {
  const input = document.querySelector<HTMLInputElement>(`#${id}`)
  if (!input) {
    throw new Error(`Missing input: #${id}`)
  }

  return input
}

const setupSignInFormMocks = (): void => {
  pushMock.mockClear()
  signInEmailMock.mockClear()
  toastSuccessMock.mockClear()
  toastErrorMock.mockClear()

  signInEmailMock.mockResolvedValue({
    data: { redirect: false, token: "test-token", user: createAuthSessionFixture().user },
    error: null,
  })
}

const setupSignUpFormMocks = (): void => {
  pushMock.mockClear()
  signUpMock.mockReset()
  triggerConfettiMock.mockClear()
  toastSuccessMock.mockClear()
  toastErrorMock.mockClear()

  signUpMock.mockResolvedValue({ token: null, user: createAuthSessionFixture().user })
}

const setupForgotPasswordFormMocks = (): void => {
  requestPasswordResetMock.mockClear()
  toastSuccessMock.mockClear()
  toastErrorMock.mockClear()

  requestPasswordResetMock.mockResolvedValue({ message: "ok", status: true })
}

const setupResetPasswordFormMocks = (): void => {
  resetPasswordMock.mockClear()
  toastSuccessMock.mockClear()
  toastErrorMock.mockClear()

  resetPasswordMock.mockResolvedValue({ status: true })
}

const setupOAuthButtonsMocks = (): void => {
  signInSocialMock.mockClear()
  toastSuccessMock.mockClear()
  toastErrorMock.mockClear()

  signInSocialMock.mockImplementation(async ({ fetchOptions }) => {
    await invokeFetchOnSuccess(fetchOptions)
  })
}

vi.mock(import("~/src/lib/confetti"), () => ({
  triggerConfetti: triggerConfettiMock,
}))

vi.mock(import("sonner"), async (importOriginal): Promise<Partial<typeof Sonner>> => {
  const actual = await importOriginal<typeof Sonner>()

  vi.spyOn(actual.toast, "success").mockImplementation(toastSuccessMock)
  vi.spyOn(actual.toast, "error").mockImplementation(toastErrorMock)

  return actual
})

vi.mock(import("~/src/modules/account/use-cases/sign-up-with-password"), () => ({
  signUpWithPasswordMutation: { mutationFn: signUpMock, mutationKey: ACCOUNT_MUTATION_KEYS.SIGN_UP_WITH_PASSWORD },
}))

vi.mock(import("~/src/modules/verification/use-cases/request-password-reset"), () => ({
  requestPasswordResetMutation: { mutationFn: requestPasswordResetMock, mutationKey: VERIFICATION_MUTATION_KEYS.REQUEST_PASSWORD_RESET },
}))

vi.mock(import("~/src/modules/verification/use-cases/reset-password"), () => ({
  resetPasswordMutation: { mutationFn: resetPasswordMock, mutationKey: VERIFICATION_MUTATION_KEYS.RESET_PASSWORD },
}))

vi.mock(import("~/src/integrations/better-auth/auth.client"), async (importOriginal): Promise<Partial<typeof AuthClient>> => {
  const actual = await importOriginal<typeof AuthClient>()

  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      signIn: {
        ...actual.authClient.signIn,
        social: signInSocialMock,
      },
    },
    signIn: {
      ...actual.signIn,
      email: signInEmailMock,
    },
  }
})

describe("sign in form", () => {
  it("lets the user reveal and hide their password without changing it", async () => {
    setupSignInFormMocks()
    const user = userEvent.setup()
    renderWithAuthMessages(<SignInForm />)
    const input = getPasswordInput("sign-in-password")
    await user.type(input, TEST_PASSWORD)
    await user.click(screen.getByRole("button", { name: authFormMessages.showPassword }))
    expect(input).toHaveAttribute("type", "text")
    expect(input).toHaveValue(TEST_PASSWORD)
    await user.click(screen.getByRole("button", { name: authFormMessages.hidePassword }))
    expect(input).toHaveAttribute("type", "password")
    expect(signInEmailMock).not.toHaveBeenCalled()
  })

  it.each(["EMAIL_NOT_VERIFIED", "INVALID_EMAIL_OR_PASSWORD"] as const)("handles %s without entering the workspace", async (code) => {
    setupSignInFormMocks()
    signInEmailMock.mockResolvedValueOnce({
      data: null,
      error: { code, message: "Sign in rejected", status: 403, statusText: "Forbidden" },
    })
    const user = userEvent.setup()
    renderWithAuthMessages(<SignInForm />)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("sign-in-form-submit-button"))
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(authErrorsMessages[AUTH_ERRORS[code]])
    })
    expect(toastSuccessMock).not.toHaveBeenCalled()
    if (code === "EMAIL_NOT_VERIFIED") {
      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith({ search: { email: TEST_EMAIL }, to: ROUTES.VERIFY_EMAIL })
      })
    } else {
      expect(pushMock).not.toHaveBeenCalled()
    }
  })

  it("reports network failures and lets the customer retry", async () => {
    setupSignInFormMocks()
    signInEmailMock.mockRejectedValueOnce(new Error("Network unavailable"))
    const user = userEvent.setup()
    renderWithAuthMessages(<SignInForm />)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("sign-in-form-submit-button"))
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(screen.getByTestId("sign-in-form-submit-button")).not.toHaveAttribute("aria-disabled")
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("waits for the two-factor challenge instead of announcing a completed sign-in", async () => {
    setupSignInFormMocks()
    signInEmailMock.mockResolvedValueOnce({ data: { twoFactorRedirect: true }, error: null })
    const user = userEvent.setup()
    renderWithAuthMessages(<SignInForm />)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("sign-in-form-submit-button"))
    await waitFor(() => {
      expect(signInEmailMock).toHaveBeenCalledOnce()
    })
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("blocks submit when email is invalid", async () => {
    setupSignInFormMocks()
    const user = userEvent.setup()
    renderWithAuthMessages(<SignInForm />)

    await user.type(screen.getByLabelText(/email/iu), "not-an-email")
    await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("sign-in-form-submit-button"))

    expect(screen.getByLabelText(/email/iu)).toHaveAttribute("aria-invalid", "true")
    expect(signInEmailMock).not.toHaveBeenCalled()
  })

  it("explains a missing password and clears the error once one is entered", async () => {
    setupSignInFormMocks()
    const user = userEvent.setup()
    renderWithAuthMessages(<SignInForm />)
    const password = getPasswordInput("sign-in-password")

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.click(screen.getByTestId("sign-in-form-submit-button"))

    expect(password).toHaveAttribute("aria-invalid", "true")
    expect(password).toHaveAccessibleDescription(authValidationMessages.passwordRequired)
    expect(screen.getByLabelText(/email/iu)).toHaveAttribute("aria-invalid", "false")
    expect(signInEmailMock).not.toHaveBeenCalled()

    await user.type(password, TEST_PASSWORD)

    expect(password).toHaveAttribute("aria-invalid", "false")
    expect(password).not.toHaveAttribute("aria-describedby")
    expect(screen.queryByText(authValidationMessages.passwordRequired)).not.toBeInTheDocument()
  })

  it("shows progress and ignores repeat submits until sign-in finishes", async () => {
    setupSignInFormMocks()
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof signInEmailMock>>>()
    signInEmailMock.mockReturnValueOnce(pending.promise)
    const user = userEvent.setup()
    renderWithAuthMessages(<SignInForm />)
    const submit = screen.getByTestId("sign-in-form-submit-button")

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
    await user.click(submit)

    expect(submit).toHaveTextContent(pagesAuthSignInMessages.form.submitting)
    expectPending(submit)
    await user.click(submit)
    expect(signInEmailMock).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve({ data: { twoFactorRedirect: true }, error: null })
      await pending.promise
    })
    await waitFor(() => {
      expect(submit).toHaveTextContent(pagesAuthSignInMessages.form.submit)
    })
    expectIdle(submit)
  })

  it("signs in and delegates to the guarded auth callback", async () => {
    setupSignInFormMocks()
    const user = userEvent.setup()
    renderWithAuthMessages(<SignInForm />)

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("sign-in-form-submit-button"))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({ replace: true, to: ROUTES.AUTH_CALLBACK })
    })
    expect(signInEmailMock).toHaveBeenCalledWith(expect.objectContaining({ email: TEST_EMAIL, password: TEST_PASSWORD }))
    expect(toastSuccessMock).toHaveBeenCalledWith(pagesAuthSignInMessages.form.success)
  })
})

describe("sign up form", () => {
  it("does not show the verification page or celebrate when account creation fails", async () => {
    setupSignUpFormMocks()
    signUpMock.mockRejectedValueOnce(new Error("Sign up unavailable"))
    const user = userEvent.setup()
    renderWithAuthMessages(<SignUpForm />)
    await user.type(screen.getByLabelText(/^name$/iu), TEST_NAME)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-up-password"), TEST_PASSWORD)
    await user.type(getPasswordInput("sign-up-confirmPassword"), TEST_PASSWORD)
    await user.click(screen.getByRole("button", { name: "Continue" }))
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(triggerConfettiMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("blocks submit when passwords do not match", async () => {
    setupSignUpFormMocks()
    const user = userEvent.setup()
    renderWithAuthMessages(<SignUpForm />)

    await user.type(screen.getByLabelText(/^name$/iu), TEST_NAME)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-up-password"), TEST_PASSWORD)
    await user.type(getPasswordInput("sign-up-confirmPassword"), "Different1!")
    expect(screen.getByText("Passwords match").parentElement).toHaveTextContent("Requirement not met")
    await user.clear(getPasswordInput("sign-up-confirmPassword"))
    await user.type(getPasswordInput("sign-up-confirmPassword"), TEST_PASSWORD)
    expect(screen.getByText("Passwords match").parentElement).toHaveTextContent("Requirement met")
    await user.type(getPasswordInput("sign-up-password"), "changed")
    expect(screen.getByText("Passwords match").parentElement).toHaveTextContent("Requirement not met")
    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(getPasswordInput("sign-up-confirmPassword")).toHaveAttribute("aria-invalid", "true")
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it("shows progress and ignores repeat submits until the account is created", async () => {
    setupSignUpFormMocks()
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof signUpMock>>>()
    signUpMock.mockReturnValueOnce(pending.promise)
    const user = userEvent.setup()
    renderWithAuthMessages(<SignUpForm />)
    const submit = screen.getByRole("button", { name: pagesAuthSignUpMessages.form.submit })

    await user.type(screen.getByLabelText(/^name$/iu), TEST_NAME)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-up-password"), TEST_PASSWORD)
    await user.type(getPasswordInput("sign-up-confirmPassword"), TEST_PASSWORD)
    await user.click(submit)

    expect(submit).toHaveTextContent(pagesAuthSignUpMessages.form.submitting)
    expectPending(submit)
    await user.click(submit)
    expect(signUpMock).toHaveBeenCalledOnce()
    expect(triggerConfettiMock).not.toHaveBeenCalled()

    await act(async () => {
      pending.resolve({ token: null, user: createAuthSessionFixture().user })
      await pending.promise
    })
    await waitFor(() => {
      expect(submit).toHaveTextContent(pagesAuthSignUpMessages.form.submit)
    })
    expectIdle(submit)
    expect(triggerConfettiMock).toHaveBeenCalledOnce()
  })

  it("signs up, celebrates, and redirects", async () => {
    setupSignUpFormMocks()
    const user = userEvent.setup()
    renderWithAuthMessages(<SignUpForm />)

    await user.type(screen.getByLabelText(/^name$/iu), TEST_NAME)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-up-password"), TEST_PASSWORD)
    await user.type(getPasswordInput("sign-up-confirmPassword"), TEST_PASSWORD)
    await user.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() => {
      expect(triggerConfettiMock).toHaveBeenCalledWith()
    })
    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD }),
      expect.anything(),
    )
    expect(pushMock).toHaveBeenLastCalledWith({ search: { email: TEST_EMAIL }, to: ROUTES.VERIFY_EMAIL })
  })
})

describe("forgot password form", () => {
  it("allows retry after a failed request and disables the form only after success", async () => {
    setupForgotPasswordFormMocks()
    requestPasswordResetMock.mockRejectedValueOnce(new Error("Email delivery failed"))
    const user = userEvent.setup()
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
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledOnce()
    })
    expect(email).toBeDisabled()
    expect(submit).toBeDisabled()
    expect(requestPasswordResetMock).toHaveBeenCalledTimes(2)
  })

  it("requests a password reset email", async () => {
    setupForgotPasswordFormMocks()
    const user = userEvent.setup()
    const { queryClient } = renderWithAuthMessages(<ForgotPasswordForm />)
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture())

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.click(screen.getByTestId("forgot-password-form-submit-button"))

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith(pagesAuthForgotPasswordMessages.form.success)
    })
    expect(requestPasswordResetMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: TEST_EMAIL, redirectTo: ROUTES.RESET_PASSWORD }),
      expect.anything(),
    )
    expect(screen.getByTestId("forgot-password-form-submit-button")).toBeDisabled()
    expect(queryClient.getQueryState(getCurrentSessionQuery.queryKey)?.isInvalidated).toBe(false)
  })

  it("shows progress and ignores repeat submits until the reset email is requested", async () => {
    setupForgotPasswordFormMocks()
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof requestPasswordResetMock>>>()
    requestPasswordResetMock.mockReturnValueOnce(pending.promise)
    const user = userEvent.setup()
    renderWithAuthMessages(<ForgotPasswordForm />)
    const submit = screen.getByTestId("forgot-password-form-submit-button")

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.click(submit)

    expect(submit).toHaveTextContent(pagesAuthForgotPasswordMessages.form.submitting)
    expectPending(submit)
    await user.click(submit)
    expect(requestPasswordResetMock).toHaveBeenCalledOnce()
    expect(toastSuccessMock).not.toHaveBeenCalled()

    await act(async () => {
      pending.resolve({ message: "ok", status: true })
      await pending.promise
    })
    await waitFor(() => {
      expect(submit).toHaveTextContent(pagesAuthForgotPasswordMessages.form.submit)
    })
    expect(submit.querySelector(".animate-spin")).not.toBeInTheDocument()
    expect(submit).toBeDisabled()
    expect(toastSuccessMock).toHaveBeenCalledWith(pagesAuthForgotPasswordMessages.form.success)
  })
})

describe("reset password form", () => {
  it("keeps the reset form available when the token is rejected", async () => {
    setupResetPasswordFormMocks()
    resetPasswordMock.mockRejectedValueOnce(new Error("Reset link expired"))
    const user = userEvent.setup()
    const { navigate } = await renderResetPasswordPage()
    await user.type(getPasswordInput("reset-password-password"), TEST_PASSWORD)
    await user.type(getPasswordInput("reset-password-confirmPassword"), TEST_PASSWORD)
    await user.click(screen.getByTestId("reset-password-form-submit-button"))
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(screen.getByTestId("reset-password-form-submit-button")).not.toHaveAttribute("aria-disabled")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("blocks submit when passwords do not match", async () => {
    setupResetPasswordFormMocks()
    const user = userEvent.setup()
    await renderResetPasswordPage()

    await user.type(getPasswordInput("reset-password-password"), TEST_PASSWORD)
    await user.type(getPasswordInput("reset-password-confirmPassword"), "Different1!")
    await user.click(screen.getByTestId("reset-password-form-submit-button"))

    expect(getPasswordInput("reset-password-confirmPassword")).toHaveAttribute("aria-invalid", "true")
    expect(resetPasswordMock).not.toHaveBeenCalled()
  })

  it("shows progress and ignores repeat submits until the new password is saved", async () => {
    setupResetPasswordFormMocks()
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof resetPasswordMock>>>()
    resetPasswordMock.mockReturnValueOnce(pending.promise)
    const user = userEvent.setup()
    const { navigate } = await renderResetPasswordPage()
    const submit = screen.getByTestId("reset-password-form-submit-button")

    await user.type(getPasswordInput("reset-password-password"), TEST_PASSWORD)
    await user.type(getPasswordInput("reset-password-confirmPassword"), TEST_PASSWORD)
    await user.click(submit)

    expect(submit).toHaveTextContent(pagesAuthResetPasswordMessages.form.submitting)
    expectPending(submit)
    await user.click(submit)
    expect(resetPasswordMock).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()

    await act(async () => {
      pending.resolve({ status: true })
      await pending.promise
    })
    await waitFor(() => {
      expect(submit).toHaveTextContent(pagesAuthResetPasswordMessages.form.submit)
    })
    expectIdle(submit)
    expect(navigate).toHaveBeenCalledWith({ to: ROUTES.SIGN_IN })
  })

  it("submits the new password with the reset token", async () => {
    setupResetPasswordFormMocks()
    const user = userEvent.setup()
    const { navigate } = await renderResetPasswordPage()

    await user.type(getPasswordInput("reset-password-password"), TEST_PASSWORD)
    await user.type(getPasswordInput("reset-password-confirmPassword"), TEST_PASSWORD)
    await user.click(screen.getByTestId("reset-password-form-submit-button"))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: ROUTES.SIGN_IN })
    })
    expect(resetPasswordMock).toHaveBeenCalledWith(
      { confirmPassword: TEST_PASSWORD, password: TEST_PASSWORD, token: RESET_TOKEN },
      expect.anything(),
    )
  })
})

describe("o auth buttons", () => {
  it("shows the provider error when OAuth cannot start", async () => {
    setupOAuthButtonsMocks()
    signInSocialMock.mockImplementationOnce(async ({ fetchOptions }) => {
      const context: ErrorContext = {
        ...createAuthSuccessContext(),
        error: Object.assign(new BetterFetchError(401, "Unauthorized", {}), { code: "INVALID_EMAIL_OR_PASSWORD" }),
      }
      await fetchOptions?.onError?.(context)
    })
    const user = userEvent.setup()
    renderWithAuthMessages(<OAuthButtons />)
    await user.click(screen.getByRole("button", { name: authOauthMessages.github }))
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(authErrorsMessages.invalidEmailOrPassword)
    })
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it("uses a neutral continue label when creating an account", () => {
    setupOAuthButtonsMocks()
    renderWithAuthMessages(<OAuthButtons intent="sign-up" />)

    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeVisible()
    expect(screen.queryByRole("button", { name: authOauthMessages.github })).not.toBeInTheDocument()
  })

  it("starts GitHub OAuth sign-in", async () => {
    setupOAuthButtonsMocks()
    const user = userEvent.setup()
    renderWithAuthMessages(<OAuthButtons />)

    await user.click(screen.getByRole("button", { name: authOauthMessages.github }))

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith(authOauthMessages.success)
    })
    expect(signInSocialMock).toHaveBeenCalledWith(expect.objectContaining({ callbackURL: ROUTES.AUTH_CALLBACK, provider: "github" }))
  })
})
