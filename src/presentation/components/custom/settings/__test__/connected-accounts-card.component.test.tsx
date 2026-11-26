import { BetterFetchError, type ErrorContext } from "@better-fetch/fetch"
import { act, screen, waitFor, within } from "@testing-library/react"
import { toast } from "sonner"
import { createTranslator } from "use-intl"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRequestUrl } from "~/src/platform/testing/lib/test-request"

import type * as AuthClient from "~/src/integrations/better-auth/auth.client"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { ACCOUNT_MUTATION_KEYS, ACCOUNT_QUERY_KEYS } from "~/src/modules/account/account.constants"
import type * as UnlinkAccountUseCase from "~/src/modules/account/use-cases/unlink-account"

import { OAUTH_PROVIDERS, SETTINGS_TAB } from "~/src/data/auth"

import {
  CREDENTIAL_ACCOUNT,
  GITHUB_ACCOUNT,
  GOOGLE_ACCOUNT,
  SETTINGS_DATE,
  renderSettings,
} from "~/src/presentation/components/custom/settings/__test__/fixtures"
import { ConnectedAccountsCard } from "~/src/presentation/components/custom/settings/connected-accounts-card"

import authErrorsMessages from "~/messages/en-US/auth.errors.json"
import authSecurityMessages from "~/messages/en-US/auth.security.json"
import errorsMessages from "~/messages/en-US/errors.json"
import { ROUTES } from "~/src/routes"

type Linked = Awaited<ReturnType<typeof AuthClient.authClient.linkSocial>>
type Unlinked = Awaited<ReturnType<NonNullable<typeof UnlinkAccountUseCase.unlinkAccountMutation.mutationFn>>>

const linkSocialMock = vi.hoisted(() => vi.fn<typeof AuthClient.authClient.linkSocial>())
const unlinkMock = vi.hoisted(() => vi.fn<NonNullable<typeof UnlinkAccountUseCase.unlinkAccountMutation.mutationFn>>())

vi.mock(import("~/src/integrations/better-auth/auth.client"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, authClient: { ...actual.authClient, linkSocial: linkSocialMock } }
})
vi.mock(import("~/src/modules/account/use-cases/unlink-account"), () => ({
  unlinkAccountMutation: { mutationFn: unlinkMock, mutationKey: ACCOUNT_MUTATION_KEYS.UNLINK },
}))

const labels = authSecurityMessages.accounts
const [GITHUB, GOOGLE] = OAUTH_PROVIDERS
const LINK_ERROR_CODE = "UNABLE_TO_LINK_ACCOUNT" satisfies keyof typeof AUTH_ERRORS
const LINKED: Linked = { data: { redirect: true, status: true, url: "https://github.com/login/oauth/authorize" }, error: null }
const UNLINKED: Unlinked = { status: true }

const rowOf = (provider: string): HTMLElement => {
  const rows = screen.getAllByRole("listitem").filter((row) => within(row).queryByText(provider) !== null)
  expect(rows).toHaveLength(1)
  const [row] = rows
  if (row === undefined) {
    throw new Error(`No row shows ${provider}`)
  }
  return row
}

const disconnectLabel = (provider: string): string => labels.disconnectLabel.replace("{provider}", provider)
const connectLabel = (provider: string): string => labels.connectLabel.replace("{provider}", provider)

const linkErrorContext = (): ErrorContext => {
  const body = { code: LINK_ERROR_CODE, message: LINK_ERROR_CODE }
  const error = Object.assign(new BetterFetchError(HTTP_STATUS.BAD_REQUEST, "Bad Request", body), body)
  return {
    error,
    request: {
      body: undefined,
      headers: new Headers(),
      method: "POST",
      signal: new AbortController().signal,
      url: createTestRequestUrl(ROUTES.API.AUTH.BASE),
    },
    response: new Response(null, { status: error.status }),
  }
}

beforeEach(() => {
  linkSocialMock.mockReset().mockResolvedValue(LINKED)
  unlinkMock.mockReset().mockResolvedValue(UNLINKED)
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("connected accounts", () => {
  it("shows each provider as connected since its date or not connected", () => {
    renderSettings(<ConnectedAccountsCard />, { accounts: [CREDENTIAL_ACCOUNT, GITHUB_ACCOUNT] })
    const t = createTranslator({
      formats: I18N.FORMATS,
      locale: "en-US",
      messages: { auth: { security: authSecurityMessages } },
      namespace: "auth.security.accounts",
      timeZone: I18N.DEFAULT_TIMEZONE,
    })

    expect(screen.getByRole("heading", { name: labels.title })).toBeVisible()
    expect(within(rowOf(GITHUB.name)).getByText(t("connected", { date: SETTINGS_DATE }))).toBeVisible()
    expect(within(rowOf(GITHUB.name)).getByRole("button", { name: disconnectLabel(GITHUB.name) })).toBeEnabled()
    expect(within(rowOf(GOOGLE.name)).getByText(labels.notConnected)).toBeVisible()
    expect(within(rowOf(GOOGLE.name)).getByRole("button", { name: connectLabel(GOOGLE.name) })).toBeEnabled()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByText(labels.lastMethod)).not.toBeInTheDocument()
  })

  it("keeps the only way to sign in connected and says why", () => {
    renderSettings(<ConnectedAccountsCard />, { accounts: [GITHUB_ACCOUNT] })

    expect(screen.queryByRole("button", { name: disconnectLabel(GITHUB.name) })).not.toBeInTheDocument()
    expect(screen.getByText(labels.lastMethod)).toBeVisible()
  })

  it("offers every provider to an account that signs in only with a password, without the last-method note", () => {
    renderSettings(<ConnectedAccountsCard />)

    expect(OAUTH_PROVIDERS.map(({ name }) => screen.getByRole("button", { name: connectLabel(name) }))).toHaveLength(OAUTH_PROVIDERS.length)
    expect(screen.queryByText(labels.lastMethod)).not.toBeInTheDocument()
  })

  it.each([
    { code: LINK_ERROR_CODE.toLowerCase(), message: authErrorsMessages[AUTH_ERRORS.UNABLE_TO_LINK_ACCOUNT] },
    { code: "not_a_better_auth_code", message: authErrorsMessages[AUTH_ERRORS.UNKNOWN_ERROR] },
  ])("explains a failed connection that returned with ?error=$code", ({ code, message }) => {
    renderSettings(<ConnectedAccountsCard />, { path: `${ROUTES.APP.SETTINGS.INDEX}?tab=${SETTINGS_TAB.SECURITY}&error=${code}` })

    expect(screen.getByRole("alert")).toHaveTextContent(message)
  })
})

describe("connecting a provider", () => {
  it.each([ROUTES.APP.SETTINGS.INDEX, ROUTES.ADMIN.SETTINGS])(
    "returns to the security tab of %s, after success or failure",
    async (page) => {
      const { user } = renderSettings(<ConnectedAccountsCard />, { path: `${page}?tab=${SETTINGS_TAB.GENERAL}&error=${LINK_ERROR_CODE}` })
      await user.click(within(rowOf(GOOGLE.name)).getByRole("button", { name: connectLabel(GOOGLE.name) }))

      const callbackURL = `${page}?tab=${SETTINGS_TAB.SECURITY}`
      await waitFor(() => {
        expect(linkSocialMock).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ callbackURL, errorCallbackURL: callbackURL, provider: AUTH_PROVIDER.GOOGLE }),
        )
      })
    },
  )

  it("marks only the provider being connected as pending", async () => {
    const pending = Promise.withResolvers<Linked>()
    linkSocialMock.mockReturnValueOnce(pending.promise)
    const { user } = renderSettings(<ConnectedAccountsCard />)
    const github = within(rowOf(GITHUB.name)).getByRole("button", { name: connectLabel(GITHUB.name) })
    await user.click(github)

    await waitFor(() => {
      expect(github).toHaveAttribute("aria-disabled", "true")
    })
    expect(within(rowOf(GOOGLE.name)).getByRole("button", { name: connectLabel(GOOGLE.name) })).not.toHaveAttribute("aria-disabled")
    await act(async () => {
      pending.resolve(LINKED)
      await pending.promise
    })
    await waitFor(() => {
      expect(github).not.toHaveAttribute("aria-disabled")
    })
  })

  it("reports a connection the server refuses", async () => {
    linkSocialMock.mockImplementationOnce(async ({ fetchOptions }) => {
      await fetchOptions?.onError?.(linkErrorContext())
      return {
        data: null,
        error: { code: LINK_ERROR_CODE, message: LINK_ERROR_CODE, status: HTTP_STATUS.BAD_REQUEST, statusText: "Bad Request" },
      }
    })
    const { user } = renderSettings(<ConnectedAccountsCard />)
    await user.click(within(rowOf(GITHUB.name)).getByRole("button", { name: connectLabel(GITHUB.name) }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(authErrorsMessages[AUTH_ERRORS.UNABLE_TO_LINK_ACCOUNT])
    })
  })
})

describe("disconnecting a provider", () => {
  it("disconnects the provider, says so and refreshes the accounts", async () => {
    const { invalidate, user } = renderSettings(<ConnectedAccountsCard />, { accounts: [CREDENTIAL_ACCOUNT, GITHUB_ACCOUNT] })
    await user.click(screen.getByRole("button", { name: disconnectLabel(GITHUB.name) }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledExactlyOnceWith(labels.disconnected.replace("{provider}", GITHUB.name))
    })
    expect(unlinkMock).toHaveBeenCalledExactlyOnceWith({ accountId: GITHUB_ACCOUNT.id }, expect.anything())
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ACCOUNT_QUERY_KEYS.ALL })
  })

  it("marks only the provider being disconnected as pending", async () => {
    const pending = Promise.withResolvers<Unlinked>()
    unlinkMock.mockReturnValueOnce(pending.promise)
    const { user } = renderSettings(<ConnectedAccountsCard />, { accounts: [GITHUB_ACCOUNT, GOOGLE_ACCOUNT] })
    const github = screen.getByRole("button", { name: disconnectLabel(GITHUB.name) })
    await user.click(github)

    await waitFor(() => {
      expect(github).toHaveAttribute("aria-disabled", "true")
    })
    expect(screen.getByRole("button", { name: disconnectLabel(GOOGLE.name) })).not.toHaveAttribute("aria-disabled")
    await act(async () => {
      pending.resolve(UNLINKED)
      await pending.promise
    })
  })

  it("reports a failed disconnection without refreshing the accounts", async () => {
    unlinkMock.mockRejectedValueOnce(new Error("Network unavailable"))
    const { invalidate, user } = renderSettings(<ConnectedAccountsCard />, { accounts: [GITHUB_ACCOUNT, GOOGLE_ACCOUNT] })
    await user.click(screen.getByRole("button", { name: disconnectLabel(GOOGLE.name) }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
  })
})
