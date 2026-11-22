import type { ReactElement } from "react"

import { BetterFetchError, type ErrorContext } from "@better-fetch/fetch"
import { getRequest } from "@tanstack/react-start/server"
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"
import { createTestRequestUrl } from "~/src/platform/testing/lib/test-request"

import type * as AuthClient from "~/src/integrations/better-auth/auth.client"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"

import { OAUTH_PROVIDERS } from "~/src/data/auth"

import { OAuthButtons, OAuthLinks } from "~/src/presentation/components/custom/auth/oauth-buttons"

import authErrorsMessages from "~/messages/en-US/auth.errors.json"
import authOauthMessages from "~/messages/en-US/auth.oauth.json"
import { ROUTES } from "~/src/routes"

const [githubProvider, googleProvider] = OAUTH_PROVIDERS
const continueWith = (provider: string): string => authOauthMessages.continueWith.replace("{provider}", provider)

const signInSocialMock = vi.hoisted(() => vi.fn<typeof AuthClient.authClient.signIn.social>())

vi.mock(import("~/src/integrations/better-auth/auth.client"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    authClient: { ...actual.authClient, signIn: { ...actual.authClient.signIn, social: signInSocialMock } },
  }
})

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

const clickSignIn = async (buttons: ReactElement = <OAuthButtons />): Promise<void> => {
  renderWithRouter(
    <IntlProvider locale="en-US" messages={{ auth: { errors: authErrorsMessages, oauth: authOauthMessages } }}>
      {buttons}
    </IntlProvider>,
  )
  await userEvent.setup({ delay: null }).click(screen.getByRole("button", { name: continueWith(githubProvider.name) }))
}

beforeEach(() => {
  vi.mocked(getRequest).mockReturnValue(new Request(createTestRequestUrl(`/pl-PL${ROUTES.SIGN_IN}`)))
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
          provider: AUTH_PROVIDER.GITHUB,
        }),
      )
    })
  })

  it("returns to the page it is given after the provider, or after a failed callback, in the visitor's locale", async () => {
    const page = `${ROUTES.ACCEPT_INVITATION}?${new URLSearchParams({ token: "invitation-token" }).toString()}`
    const withPage = new URLSearchParams({ redirect: page }).toString()

    await clickSignIn(<OAuthButtons redirect={page} />)

    await waitFor(() => {
      expect(signInSocialMock).toHaveBeenCalledWith(
        expect.objectContaining({
          callbackURL: `/pl-PL${ROUTES.AUTH_CALLBACK}?${withPage}`,
          errorCallbackURL: `/pl-PL${ROUTES.SIGN_IN}?${withPage}`,
        }),
      )
    })
  })

  it("shows progress only on the provider being started until the redirect request settles", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof signInSocialMock>>>()
    signInSocialMock.mockReturnValueOnce(pending.promise)

    await clickSignIn()

    const github = screen.getByRole("button", { name: continueWith(githubProvider.name) })
    const google = screen.getByRole("button", { name: continueWith(googleProvider.name) })
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

  it("marks only the provider link being started among the recovery links", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof signInSocialMock>>>()
    signInSocialMock.mockReturnValueOnce(pending.promise)
    renderWithRouter(
      <IntlProvider locale="en-US" messages={{ auth: { errors: authErrorsMessages, oauth: authOauthMessages } }}>
        <ul>
          <OAuthLinks />
        </ul>
      </IntlProvider>,
    )

    await userEvent.setup({ delay: null }).click(screen.getByRole("button", { name: continueWith(googleProvider.name) }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: continueWith(googleProvider.name) })).toHaveAttribute("aria-disabled", "true")
    })
    expect(screen.getByRole("button", { name: continueWith(githubProvider.name) })).not.toHaveAttribute("aria-disabled")
    expect(signInSocialMock).toHaveBeenCalledWith(expect.objectContaining({ provider: AUTH_PROVIDER.GOOGLE }))

    await act(async () => {
      pending.resolve({ data: { redirect: true, url: "https://accounts.google.com" }, error: null })
      await pending.promise
    })
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
