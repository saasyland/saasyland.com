import { type ReactNode } from "react"

import { BetterFetchError, type ErrorContext, type SuccessContext } from "@better-fetch/fetch"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, render as renderView, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type * as Sonner from "sonner"
import type { ExternalToast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter as render } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import type * as AuthClient from "~/src/integrations/better-auth/auth.client"
import { AUTH_PROVIDER, LAST_LOGIN_METHOD_COOKIE, LOGIN_METHOD } from "~/src/integrations/better-auth/auth.constants"
import { PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type * as SignUpUseCase from "~/src/modules/account/use-cases/sign-up-with-password"
import type * as ResetPasswordUseCase from "~/src/modules/verification/use-cases/reset-password"
import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"

import { Route as ResetPasswordRoute } from "~/src/routes/auth.reset-password"

import { OAUTH_PROVIDERS } from "~/src/data/auth"

import { OAuthButtons } from "~/src/presentation/components/custom/auth/oauth-buttons"
import { SignInForm } from "~/src/presentation/components/custom/auth/sign-in-form"
import { SignUpForm } from "~/src/presentation/components/custom/auth/sign-up-form"

import authErrorsMessages from "~/messages/en-US/auth.errors.json"
import authFormMessages from "~/messages/en-US/auth.form.json"
import authOauthMessages from "~/messages/en-US/auth.oauth.json"
import authValidationMessages from "~/messages/en-US/auth.validations.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesAuthResetPasswordMessages from "~/messages/en-US/pages.auth.reset-password.json"
import pagesAuthSignInMessages from "~/messages/en-US/pages.auth.sign-in.json"
import pagesAuthSignUpMessages from "~/messages/en-US/pages.auth.sign-up.json"
import type { RouterContext } from "~/src/router"
import * as ROUTES from "~/src/routes"

type SonnerTitle = (() => ReactNode) | ReactNode
type ToastMethod = (message: SonnerTitle, data?: ExternalToast) => string | number

const TEST_EMAIL = "user@example.com"
const TEST_PASSWORD = "correct horse battery"
const TEST_NAME = "Test User"
const RESET_TOKEN = "reset-token-123"

const enMessages = getTestMessages("en-US")

const router = createTestRouter()
const pushMock = vi.spyOn(router, "navigate").mockResolvedValue()
const signInEmailMock = vi.hoisted(() => vi.fn<typeof AuthClient.signIn.email>())
const signUpMock = vi.hoisted(() => vi.fn<NonNullable<typeof SignUpUseCase.signUpWithPasswordMutation.mutationFn>>())
const resetPasswordMock = vi.hoisted(() => vi.fn<NonNullable<typeof ResetPasswordUseCase.resetPasswordMutation.mutationFn>>())
const signInSocialMock = vi.hoisted(() => vi.fn<typeof AuthClient.authClient.signIn.social>())
const toastSuccessMock = vi.hoisted(() => vi.fn<ToastMethod>(() => 0))
const toastErrorMock = vi.hoisted(() => vi.fn<ToastMethod>(() => 0))

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
  toastSuccessMock.mockClear()
  toastErrorMock.mockClear()

  signUpMock.mockResolvedValue({ signedIn: true, user: createAuthSessionFixture().user })
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

vi.mock(import("sonner"), async (importOriginal): Promise<Partial<typeof Sonner>> => {
  const actual = await importOriginal<typeof Sonner>()

  vi.spyOn(actual.toast, "success").mockImplementation(toastSuccessMock)
  vi.spyOn(actual.toast, "error").mockImplementation(toastErrorMock)

  return actual
})

vi.mock(import("~/src/modules/account/use-cases/sign-up-with-password"), () => ({
  signUpWithPasswordMutation: { mutationFn: signUpMock, mutationKey: ACCOUNT_MUTATION_KEYS.SIGN_UP_WITH_PASSWORD },
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

const setLastLoginMethod = (method: string): void => {
  document.cookie = `${LAST_LOGIN_METHOD_COOKIE}=${method}; path=/`
}

afterEach(() => {
  document.cookie = `${LAST_LOGIN_METHOD_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
})

const submitSignIn = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
  await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
  await user.click(screen.getByTestId("sign-in-form-submit-button"))
}

describe("sign in form", () => {
  it("lets the user reveal and hide their password without changing it", async () => {
    setupSignInFormMocks()
    const user = userEvent.setup({ delay: null })
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

  it("sends an unconfirmed address to the verify page with the typed email", async () => {
    setupSignInFormMocks()
    signInEmailMock.mockResolvedValueOnce({
      data: null,
      error: { code: "EMAIL_NOT_VERIFIED", message: "Sign in rejected", status: 403, statusText: "Forbidden" },
    })
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignInForm />)

    await submitSignIn(user)

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({ search: { email: TEST_EMAIL, unverified: true }, to: ROUTES.VERIFY_EMAIL })
    })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it("keeps a wrong password on the page with a way to reset it or use GitHub or Google instead", async () => {
    setupSignInFormMocks()
    signInEmailMock.mockResolvedValueOnce({
      data: null,
      error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Sign in rejected", status: 401, statusText: "Unauthorized" },
    })
    setupOAuthButtonsMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignInForm />)

    await submitSignIn(user)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(authErrorsMessages[AUTH_ERRORS.INVALID_EMAIL_OR_PASSWORD])
    expect(screen.getByRole("link", { name: pagesAuthSignInMessages.form.resetPassword })).toHaveAttribute(
      "href",
      `${ROUTES.FORGOT_PASSWORD}?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    expect(alert.compareDocumentPosition(screen.getByTestId("sign-in-form-submit-button"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: continueWith(githubProvider.name) }))
    await waitFor(() => {
      expect(signInSocialMock).toHaveBeenCalledWith(expect.objectContaining({ provider: AUTH_PROVIDER.GITHUB }))
    })
  })

  it("names other refusals without offering a password reset, and clears the message on the next attempt", async () => {
    setupSignInFormMocks()
    signInEmailMock.mockResolvedValueOnce({
      data: null,
      error: { code: "TOO_MANY_REQUESTS", message: "Slow down", status: 429, statusText: "Too Many Requests" },
    })
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignInForm />)

    await submitSignIn(user)

    expect(await screen.findByRole("alert")).toHaveTextContent(authErrorsMessages[AUTH_ERRORS.TOO_MANY_REQUESTS])
    expect(screen.queryByRole("link", { name: pagesAuthSignInMessages.form.resetPassword })).not.toBeInTheDocument()
    await user.click(screen.getByTestId("sign-in-form-submit-button"))
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  it("reports network failures on the page and lets the customer retry", async () => {
    setupSignInFormMocks()
    signInEmailMock.mockRejectedValueOnce(new Error("Network unavailable"))
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignInForm />)

    await submitSignIn(user)

    expect(await screen.findByRole("alert")).toHaveTextContent(authErrorsMessages[AUTH_ERRORS.UNKNOWN_ERROR])
    expect(screen.getByTestId("sign-in-form-submit-button")).not.toHaveAttribute("aria-disabled")
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("marks email as the method used last time", () => {
    setupSignInFormMocks()
    setLastLoginMethod(LOGIN_METHOD.EMAIL)
    renderWithAuthMessages(<SignInForm />)

    expect(screen.getByText(authOauthMessages.lastUsed)).toBeVisible()
  })
})

describe("sign in form, once submitted", () => {
  it("takes the visitor to the two-factor challenge instead of announcing a completed sign-in", async () => {
    setupSignInFormMocks()
    signInEmailMock.mockResolvedValueOnce({ data: { twoFactorRedirect: true }, error: null })
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignInForm />)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("sign-in-form-submit-button"))
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(expect.objectContaining({ to: ROUTES.TWO_FACTOR }))
    })
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it("blocks submit when email is invalid", async () => {
    setupSignInFormMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignInForm />)

    await user.type(screen.getByLabelText(/email/iu), "not-an-email")
    await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("sign-in-form-submit-button"))

    expect(screen.getByLabelText(/email/iu)).toHaveAttribute("aria-invalid", "true")
    expect(signInEmailMock).not.toHaveBeenCalled()
  })

  it("explains a missing password and clears the error once one is entered", async () => {
    setupSignInFormMocks()
    const user = userEvent.setup({ delay: null })
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
    expect(password).toHaveAccessibleDescription("")
    expect(screen.queryByText(authValidationMessages.passwordRequired)).not.toBeInTheDocument()
  })

  it("shows progress and ignores repeat submits until sign-in finishes", async () => {
    setupSignInFormMocks()
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof signInEmailMock>>>()
    signInEmailMock.mockReturnValueOnce(pending.promise)
    const user = userEvent.setup({ delay: null })
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
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignInForm />)

    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-in-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("sign-in-form-submit-button"))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(expect.objectContaining({ replace: true, to: ROUTES.AUTH_CALLBACK }))
    })
    expect(signInEmailMock).toHaveBeenCalledWith(expect.objectContaining({ email: TEST_EMAIL, password: TEST_PASSWORD }))
    expect(toastSuccessMock).toHaveBeenCalledWith(pagesAuthSignInMessages.form.success)
  })
})

describe("sign up form", () => {
  it("stays on the form and says so when account creation fails", async () => {
    setupSignUpFormMocks()
    signUpMock.mockRejectedValueOnce(new Error("Sign up unavailable"))
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignUpForm />)
    await user.type(screen.getByLabelText(/^name$/iu), TEST_NAME)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-up-password"), TEST_PASSWORD)
    await user.click(screen.getByRole("button", { name: "Continue" }))
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("asks only for a name, an email and one password, with the length rule ticking off as the visitor types", async () => {
    setupSignUpFormMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignUpForm />)
    const password = getPasswordInput("sign-up-password")

    expect(document.querySelector("#sign-up-confirmPassword")).not.toBeInTheDocument()
    expect(password).not.toHaveAttribute("placeholder")
    expect(password).toHaveAttribute("aria-describedby", "sign-up-password-error sign-up-password-requirements")
    expect(document.querySelector("#sign-up-password-requirements")).toHaveTextContent(authValidationMessages.breachCheck)
    await user.type(password, "a".repeat(PASSWORD_MIN_LENGTH - 1))
    expect(screen.getByRole("listitem")).toHaveTextContent(authValidationMessages.requirementNotMet)
    expect(password).toHaveAttribute("aria-invalid", "false")
    await user.type(password, "a")
    expect(screen.getByRole("listitem")).toHaveTextContent(authValidationMessages.requirementMet)
  })

  it("keeps Continue enabled and reveals every error and focuses the first field when it is pressed early", async () => {
    setupSignUpFormMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignUpForm />)
    const name = screen.getByLabelText(/^name$/iu)
    const continueButton = screen.getByRole("button", { name: "Continue" })

    expect(continueButton).not.toHaveAttribute("aria-disabled")
    await user.type(screen.getByLabelText(/email/iu), "not-an-email")
    expect(screen.getByLabelText(/email/iu)).toHaveAttribute("aria-invalid", "false")
    await user.click(continueButton)

    expect(name).toHaveFocus()
    expect(name).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText(authValidationMessages.nameRequired)).toHaveAttribute("id", "sign-up-name-error")
    expect(screen.getByText(authValidationMessages.emailInvalid)).toHaveAttribute("id", "sign-up-email-error")
    expect(screen.getByText(authValidationMessages.passwordRequired)).toHaveAttribute("id", "sign-up-password-error")
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it("offers the likely address after a misspelt email domain and uses it when the visitor accepts it", async () => {
    setupSignUpFormMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignUpForm />)
    const email = screen.getByLabelText(/email/iu)

    await user.type(email, "ada@gmial.com")
    expect(screen.queryByRole("button", { name: "ada@gmail.com" })).not.toBeInTheDocument()
    await user.tab()
    await user.click(screen.getByRole("button", { name: "ada@gmail.com" }))

    expect(email).toHaveValue("ada@gmail.com")
    expect(screen.queryByRole("button", { name: "ada@gmail.com" })).not.toBeInTheDocument()
  })

  it("shows a password found in a known data breach on the password field instead of a toast", async () => {
    setupSignUpFormMocks()
    signUpMock.mockRejectedValueOnce(new Error(AUTH_ERRORS.PASSWORD_COMPROMISED))
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignUpForm />)
    const password = getPasswordInput("sign-up-password")

    await user.type(screen.getByLabelText(/^name$/iu), TEST_NAME)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(password, TEST_PASSWORD)
    await user.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() => {
      expect(screen.getByText(authValidationMessages.passwordCompromised)).toHaveAttribute("id", "sign-up-password-error")
    })
    expect(password).toHaveAttribute("aria-invalid", "true")
    expect(password).toHaveFocus()
    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })
})

describe("sign up outcome", () => {
  it("shows progress and ignores repeat submits until the account is created", async () => {
    setupSignUpFormMocks()
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof signUpMock>>>()
    signUpMock.mockReturnValueOnce(pending.promise)
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignUpForm />)
    const submit = screen.getByRole("button", { name: pagesAuthSignUpMessages.form.submit })

    await user.type(screen.getByLabelText(/^name$/iu), TEST_NAME)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-up-password"), TEST_PASSWORD)
    await user.click(submit)

    expect(submit).toHaveTextContent(pagesAuthSignUpMessages.form.submitting)
    expectPending(submit)
    await user.click(submit)
    expect(signUpMock).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve({ signedIn: false, user: createAuthSessionFixture().user })
      await pending.promise
    })
    await waitFor(() => {
      expect(submit).toHaveTextContent(pagesAuthSignUpMessages.form.submit)
    })
    expectIdle(submit)
    expect(toastSuccessMock).toHaveBeenCalledWith(pagesAuthSignUpMessages.form.successCheckEmail)
  })

  it("signs a new account in and goes straight on, saying where the confirmation link went", async () => {
    setupSignUpFormMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignUpForm />)

    await user.type(screen.getByLabelText(/^name$/iu), TEST_NAME)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-up-password"), TEST_PASSWORD)
    await user.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenLastCalledWith({ replace: true, search: {}, to: ROUTES.AUTH_CALLBACK })
    })
    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD }),
      expect.anything(),
    )
    expect(toastSuccessMock).toHaveBeenCalledWith(pagesAuthSignUpMessages.form.created.replace("{email}", TEST_EMAIL))
  })

  it("points to the inbox when sign-up does not sign the visitor in", async () => {
    setupSignUpFormMocks()
    signUpMock.mockResolvedValueOnce({ signedIn: false, user: createAuthSessionFixture().user })
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<SignUpForm />)

    await user.type(screen.getByLabelText(/^name$/iu), TEST_NAME)
    await user.type(screen.getByLabelText(/email/iu), TEST_EMAIL)
    await user.type(getPasswordInput("sign-up-password"), TEST_PASSWORD)
    await user.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenLastCalledWith({ search: { email: TEST_EMAIL }, to: ROUTES.VERIFY_EMAIL })
    })
    expect(toastSuccessMock).toHaveBeenCalledWith(pagesAuthSignUpMessages.form.successCheckEmail)
  })
})

describe("reset password form", () => {
  it("keeps the reset form available when the token is rejected", async () => {
    setupResetPasswordFormMocks()
    resetPasswordMock.mockRejectedValueOnce(new Error("Reset link expired"))
    const user = userEvent.setup({ delay: null })
    const { navigate } = await renderResetPasswordPage()
    await user.type(getPasswordInput("reset-password-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("reset-password-form-submit-button"))
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(screen.getByTestId("reset-password-form-submit-button")).not.toHaveAttribute("aria-disabled")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("offers a new link instead of the form when the link was used or has expired", async () => {
    setupResetPasswordFormMocks()
    resetPasswordMock.mockRejectedValueOnce(new Error(AUTH_ERRORS.INVALID_TOKEN))
    const user = userEvent.setup({ delay: null })
    const { navigate } = await renderResetPasswordPage()
    navigate.mockRestore()

    await user.type(getPasswordInput("reset-password-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("reset-password-form-submit-button"))

    expect(await screen.findByRole("link", { name: pagesAuthResetPasswordMessages.form.requestNewLink })).toHaveAttribute(
      "href",
      ROUTES.FORGOT_PASSWORD,
    )
    expect(screen.getByText(pagesAuthResetPasswordMessages.form.invalidToken)).toBeInTheDocument()
    expect(screen.queryByTestId("reset-password-form-submit-button")).not.toBeInTheDocument()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it("blocks a new password shorter than the minimum length", async () => {
    setupResetPasswordFormMocks()
    const user = userEvent.setup({ delay: null })
    await renderResetPasswordPage()

    await user.type(getPasswordInput("reset-password-password"), "a".repeat(PASSWORD_MIN_LENGTH - 1))
    await user.click(screen.getByTestId("reset-password-form-submit-button"))

    expect(getPasswordInput("reset-password-password")).toHaveAttribute("aria-invalid", "true")
    expect(getPasswordInput("reset-password-password")).toHaveFocus()
    expect(document.querySelector("#reset-password-confirmPassword")).not.toBeInTheDocument()
    expect(resetPasswordMock).not.toHaveBeenCalled()
  })

  it("shows a new password found in a known data breach on the field", async () => {
    setupResetPasswordFormMocks()
    resetPasswordMock.mockRejectedValueOnce(new Error(AUTH_ERRORS.PASSWORD_COMPROMISED))
    const user = userEvent.setup({ delay: null })
    await renderResetPasswordPage()

    await user.type(getPasswordInput("reset-password-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("reset-password-form-submit-button"))

    await waitFor(() => {
      expect(screen.getByText(authValidationMessages.passwordCompromised)).toHaveAttribute("id", "reset-password-password-error")
    })
    expect(getPasswordInput("reset-password-password")).toHaveFocus()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it("shows progress and ignores repeat submits until the new password is saved", async () => {
    setupResetPasswordFormMocks()
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof resetPasswordMock>>>()
    resetPasswordMock.mockReturnValueOnce(pending.promise)
    const user = userEvent.setup({ delay: null })
    const { navigate } = await renderResetPasswordPage()
    const submit = screen.getByTestId("reset-password-form-submit-button")

    await user.type(getPasswordInput("reset-password-password"), TEST_PASSWORD)
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
    expect(navigate).toHaveBeenCalledWith({ search: {}, to: ROUTES.SIGN_IN })
  })

  it("submits the new password with the reset token", async () => {
    setupResetPasswordFormMocks()
    const user = userEvent.setup({ delay: null })
    const { navigate } = await renderResetPasswordPage()

    await user.type(getPasswordInput("reset-password-password"), TEST_PASSWORD)
    await user.click(screen.getByTestId("reset-password-form-submit-button"))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ search: {}, to: ROUTES.SIGN_IN })
    })
    expect(resetPasswordMock).toHaveBeenCalledWith({ password: TEST_PASSWORD, token: RESET_TOKEN }, expect.anything())
  })
})

const [githubProvider] = OAUTH_PROVIDERS
const continueWith = (provider: string): string => authOauthMessages.continueWith.replace("{provider}", provider)

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
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<OAuthButtons />)
    await user.click(screen.getByRole("button", { name: continueWith(githubProvider.name) }))
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(authErrorsMessages.invalidEmailOrPassword)
    })
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it("marks the provider used last time", () => {
    setupOAuthButtonsMocks()
    setLastLoginMethod(LOGIN_METHOD.GITHUB)
    renderWithAuthMessages(<OAuthButtons />)

    const [lastUsed] = screen.getAllByText(authOauthMessages.lastUsed)
    expect(lastUsed?.closest("button")).toHaveAccessibleName(new RegExp(`^${continueWith(githubProvider.name)}`, "u"))
    expect(screen.getAllByText(authOauthMessages.lastUsed)).toHaveLength(1)
  })

  it("lists GitHub first", () => {
    setupOAuthButtonsMocks()
    renderWithAuthMessages(<OAuthButtons />)

    expect(screen.getAllByRole("button")[0]).toHaveAccessibleName(continueWith("GitHub"))
  })

  it("labels every provider with the same continue wording", () => {
    setupOAuthButtonsMocks()
    renderWithAuthMessages(<OAuthButtons />)

    expect(screen.getAllByRole("button")).toHaveLength(OAUTH_PROVIDERS.length)
    for (const { name } of OAUTH_PROVIDERS) {
      expect(screen.getByRole("button", { name: continueWith(name) })).toBeVisible()
    }
  })

  it("starts GitHub OAuth sign-in", async () => {
    setupOAuthButtonsMocks()
    const user = userEvent.setup({ delay: null })
    renderWithAuthMessages(<OAuthButtons />)

    await user.click(screen.getByRole("button", { name: continueWith(githubProvider.name) }))

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith(authOauthMessages.success)
    })
    expect(signInSocialMock).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: ROUTES.AUTH_CALLBACK, provider: AUTH_PROVIDER.GITHUB }),
    )
  })
})
