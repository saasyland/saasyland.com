import { getRequest } from "@tanstack/react-start/server"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider, useTranslations } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { createTestRequestUrl } from "~/src/platform/testing/lib/test-request"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import type * as AuthClient from "~/src/integrations/better-auth/auth.client"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type * as SignUpUseCase from "~/src/modules/account/use-cases/sign-up-with-password"

import { AUTH_LINK_TAGS } from "~/src/presentation/components/custom/auth/auth-link-tags"
import { OAuthButtons } from "~/src/presentation/components/custom/auth/oauth-buttons"
import { SignInForm } from "~/src/presentation/components/custom/auth/sign-in-form"
import { SignUpForm } from "~/src/presentation/components/custom/auth/sign-up-form"

import authOauthMessages from "~/messages/en-US/auth.oauth.json"
import { ROUTES } from "~/src/routes"

const RETURN_TO = "/pl-PL/app/license"
const ENCODED_RETURN_TO = encodeURIComponent(RETURN_TO)
const EMAIL = "ada@example.test"
const PASSWORD = "Secret1!"

const signInEmailMock = vi.hoisted(() => vi.fn<typeof AuthClient.signIn.email>())
const signInSocialMock = vi.hoisted(() => vi.fn<typeof AuthClient.authClient.signIn.social>())
const signUpMock = vi.hoisted(() => vi.fn<NonNullable<typeof SignUpUseCase.signUpWithPasswordMutation.mutationFn>>())

vi.mock(import("~/src/integrations/better-auth/auth.client"), async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    authClient: { ...actual.authClient, signIn: { ...actual.authClient.signIn, social: signInSocialMock } },
    signIn: { ...actual.signIn, email: signInEmailMock },
  }
})

vi.mock(import("~/src/lib/confetti"), () => ({ triggerConfetti: vi.fn<() => void>() }))

vi.mock(import("~/src/modules/account/use-cases/sign-up-with-password"), () => ({
  signUpWithPasswordMutation: { mutationFn: signUpMock, mutationKey: ACCOUNT_MUTATION_KEYS.SIGN_UP_WITH_PASSWORD },
}))

const AuthLinks = () => {
  const t = useTranslations("pages.auth")

  return (
    <>
      <p>{t.rich("sign-in.form.noAccount", AUTH_LINK_TAGS)}</p>
      <p>{t.rich("sign-up.form.hasAccount", AUTH_LINK_TAGS)}</p>
    </>
  )
}

const renderOnPage = (pathname: string, ui: React.ReactElement) => {
  const page = `/pl-PL${pathname}?redirect=${ENCODED_RETURN_TO}`
  vi.mocked(getRequest).mockReturnValue(new Request(createTestRequestUrl(page)))
  const router = createTestRouter(page)
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue()

  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
      {ui}
    </IntlProvider>,
    { router },
  )

  return { navigate, user: userEvent.setup() }
}

const signInWith = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.type(screen.getByLabelText(/email/iu), EMAIL)
  await user.type(screen.getByLabelText(/^password/iu), PASSWORD)
  await user.click(screen.getByTestId("sign-in-form-submit-button"))
}

beforeEach(() => {
  signInEmailMock
    .mockReset()
    .mockResolvedValue({ data: { redirect: false, token: "token", user: createAuthSessionFixture().user }, error: null })
  signInSocialMock.mockReset().mockResolvedValue({ data: { redirect: true, url: "https://github.com/login/oauth" }, error: null })
  signUpMock.mockReset().mockResolvedValue({ token: null, user: createAuthSessionFixture().user })
})

describe("return path through the auth pages", () => {
  it("continues a completed sign-in through the auth callback to the return path", async () => {
    const { navigate, user } = renderOnPage(ROUTES.SIGN_IN, <SignInForm />)

    await signInWith(user)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ replace: true, search: { redirect: RETURN_TO }, to: ROUTES.AUTH_CALLBACK })
    })
  })

  it("keeps the return path when sign-in asks for a two-factor code", async () => {
    signInEmailMock.mockResolvedValueOnce({ data: { twoFactorRedirect: true }, error: null })
    const { navigate, user } = renderOnPage(ROUTES.SIGN_IN, <SignInForm />)

    await signInWith(user)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ search: { redirect: RETURN_TO }, to: ROUTES.TWO_FACTOR })
    })
  })

  it("keeps the return path when sign-in needs a verified email first", async () => {
    signInEmailMock.mockResolvedValueOnce({ data: null, error: { code: "EMAIL_NOT_VERIFIED", status: 403, statusText: "Forbidden" } })
    const { navigate, user } = renderOnPage(ROUTES.SIGN_IN, <SignInForm />)

    await signInWith(user)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ search: { email: EMAIL, redirect: RETURN_TO }, to: ROUTES.VERIFY_EMAIL })
    })
  })

  it("asks Better Auth to verify a new account through the auth callback that carries the return path", async () => {
    const { navigate, user } = renderOnPage(ROUTES.SIGN_UP, <SignUpForm />)

    await user.type(screen.getByLabelText(/^name$/iu), "Ada Lovelace")
    await user.type(screen.getByLabelText(/email/iu), EMAIL)
    await user.type(screen.getByLabelText(/^password$/iu), PASSWORD)
    await user.type(screen.getByLabelText(/confirm password/iu), PASSWORD)
    await user.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ search: { email: EMAIL, redirect: RETURN_TO }, to: ROUTES.VERIFY_EMAIL })
    })
    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: `/pl-PL${ROUTES.AUTH_CALLBACK}?redirect=${ENCODED_RETURN_TO}` }),
      expect.anything(),
    )
  })

  it("sends OAuth back through the auth callback, and failures back to sign-in, keeping the return path", async () => {
    const { user } = renderOnPage(ROUTES.SIGN_IN, <OAuthButtons />)

    await user.click(screen.getByRole("button", { name: authOauthMessages.github }))

    await waitFor(() => {
      expect(signInSocialMock).toHaveBeenCalledWith(
        expect.objectContaining({
          callbackURL: `/pl-PL${ROUTES.AUTH_CALLBACK}?redirect=${ENCODED_RETURN_TO}`,
          errorCallbackURL: `/pl-PL${ROUTES.SIGN_IN}?redirect=${ENCODED_RETURN_TO}`,
        }),
      )
    })
  })

  it("keeps the return path on the links between sign-in and sign-up", () => {
    renderOnPage(ROUTES.SIGN_IN, <AuthLinks />)

    const [signUpLink, signInLink] = screen.getAllByRole("link")

    expect(signUpLink).toHaveAttribute("href", `/pl-PL${ROUTES.SIGN_UP}?redirect=${ENCODED_RETURN_TO}`)
    expect(signInLink).toHaveAttribute("href", `/pl-PL${ROUTES.SIGN_IN}?redirect=${ENCODED_RETURN_TO}`)
  })
})
