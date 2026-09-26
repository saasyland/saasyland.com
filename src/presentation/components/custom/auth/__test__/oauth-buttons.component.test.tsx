import { BetterFetchError, type ErrorContext } from "@better-fetch/fetch"
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"
import { createTestRequestUrl } from "~/src/platform/testing/lib/test-request"

import type * as AuthClient from "~/src/integrations/better-auth/auth.client"

import { OAuthButtons } from "~/src/presentation/components/custom/auth/oauth-buttons"

import authErrorsMessages from "~/messages/en-US/auth.errors.json"
import authOauthMessages from "~/messages/en-US/auth.oauth.json"
import { ROUTES } from "~/src/routes"

const signInSocialMock = vi.hoisted(() => vi.fn<typeof AuthClient.authClient.signIn.social>())

vi.mock(import("~/src/integrations/better-auth/auth.client"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    authClient: { ...actual.authClient, signIn: { ...actual.authClient.signIn, social: signInSocialMock } },
  }
})

vi.mock(import("~/src/integrations/use-intl/i18n.utils"), async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentLocale: () => "pl-PL",
}))

const createErrorContext = (error: BetterFetchError): ErrorContext => ({
  error,
  request: {
    body: undefined,
    headers: new Headers(),
    method: "POST",
    signal: new AbortController().signal,
    url: createTestRequestUrl(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_IN_SOCIAL}`),
  },
  response: new Response(null, { status: error.status }),
})

const clickSignIn = async (): Promise<void> => {
  renderWithRouter(
    <IntlProvider locale="en-US" messages={{ auth: { errors: authErrorsMessages, oauth: authOauthMessages } }}>
      <OAuthButtons />
    </IntlProvider>,
  )
  await userEvent.setup().click(screen.getByRole("button", { name: authOauthMessages.github }))
}

beforeEach(() => {
  signInSocialMock.mockReset().mockResolvedValue({ data: { redirect: true, url: "https://github.com/login/oauth" }, error: null })
  vi.spyOn(toast, "error").mockImplementation(() => 0)
})

describe("OAuth buttons", () => {
  it("returns callback failures to the sign-in page in the visitor's locale", async () => {
    await clickSignIn()

    await waitFor(() => {
      expect(signInSocialMock).toHaveBeenCalledWith(
        expect.objectContaining({
          callbackURL: `/pl-PL${ROUTES.AUTH_CALLBACK}`,
          errorCallbackURL: `/pl-PL${ROUTES.SIGN_IN}`,
          provider: "github",
        }),
      )
    })
  })

  it("shows progress only on the provider being started until the redirect request settles", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof signInSocialMock>>>()
    signInSocialMock.mockReturnValueOnce(pending.promise)

    await clickSignIn()

    const github = screen.getByRole("button", { name: authOauthMessages.github })
    const google = screen.getByRole("button", { name: authOauthMessages.google })
    await waitFor(() => {
      expect(github).toHaveAttribute("aria-disabled", "true")
    })
    expect(github.querySelector(".animate-spin")).toBeInTheDocument()
    expect(google).not.toHaveAttribute("aria-disabled")
    expect(google.querySelector(".animate-spin")).not.toBeInTheDocument()

    await act(async () => {
      pending.resolve({ data: { redirect: true, url: "https://github.com/login/oauth" }, error: null })
      await pending.promise
    })
    await waitFor(() => {
      expect(github).not.toHaveAttribute("aria-disabled")
    })
    expect(github.querySelector(".animate-spin")).not.toBeInTheDocument()
    expect(signInSocialMock).toHaveBeenCalledOnce()
  })

  it("asks the visitor to wait when Better Auth rate-limits the start of OAuth", async () => {
    signInSocialMock.mockImplementationOnce(async ({ fetchOptions }) => {
      await fetchOptions?.onError?.(
        createErrorContext(new BetterFetchError(429, "Too Many Requests", { message: "Too many requests. Please try again later." })),
      )
      return { data: null, error: { message: "Too many requests. Please try again later.", status: 429, statusText: "Too Many Requests" } }
    })

    await clickSignIn()

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(authErrorsMessages.tooManyRequests)
    })
  })
})
