import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { deLocalizeUrl, localizeUrl } from "~/src/integrations/use-intl/i18n.utils"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type * as ChangeEmailUseCase from "~/src/modules/account/use-cases/change-email"
import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import type * as SendVerificationEmailUseCase from "~/src/modules/verification/use-cases/send-verification-email"
import { RESEND_COOLDOWN_SECONDS, VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"

import { Route as VerifyEmailRoute } from "~/src/routes/auth.verify-email"

import authValidationsMessages from "~/messages/en-US/auth.validations.json"
import changeEmailMessages from "~/messages/en-US/components.custom.change-email-form.json"
import resendMessages from "~/messages/en-US/components.custom.email-link-resend.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesAuthVerifyEmailMessages from "~/messages/en-US/pages.auth.verify-email.json"
import plPagesAuthVerifyEmailMessages from "~/messages/pl-PL/pages.auth.verify-email.json"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

const TEST_EMAIL = "user@example.com"
const NEW_EMAIL = "new@example.com"
const RETURN_TO = "/courses/the-walkthrough/billing"
const messages = pagesAuthVerifyEmailMessages

const sessionRequest = vi.hoisted(() => vi.fn())
const resendMock = vi.hoisted(() => vi.fn<NonNullable<typeof SendVerificationEmailUseCase.sendVerificationEmailMutation.mutationFn>>())
const changeEmailMock = vi.hoisted(() => vi.fn<NonNullable<typeof ChangeEmailUseCase.changeEmailMutation.mutationFn>>())

vi.mock(import("~/src/modules/verification/use-cases/send-verification-email"), () => ({
  sendVerificationEmailMutation: { mutationFn: resendMock, mutationKey: VERIFICATION_MUTATION_KEYS.SEND_EMAIL },
}))

vi.mock(import("~/src/modules/account/use-cases/change-email"), () => ({
  changeEmailMutation: { mutationFn: changeEmailMock, mutationKey: ACCOUNT_MUTATION_KEYS.CHANGE_EMAIL },
}))

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})

const unverifiedSession = (email = TEST_EMAIL) => {
  const session = createAuthSessionFixture()
  return { ...session, user: { ...session.user, email, emailVerified: false } }
}

const renderVerifyEmail = async ({ locale = "en-US", search = "" }: Readonly<{ locale?: SupportedLocale; search?: string }> = {}) => {
  vi.mocked(getRequest).mockReturnValue(
    new Request(`http://127.0.0.1:3000${localizePathname({ locale, pathname: ROUTES.AUTH.VERIFY_EMAIL })}`),
  )
  const root = createRootRouteWithContext<RouterContext>()()
  Object.assign(VerifyEmailRoute.options, { getParentRoute: () => root, id: ROUTES.AUTH.VERIFY_EMAIL, path: ROUTES.AUTH.VERIFY_EMAIL })
  const callback = createRoute({ component: () => <h1>Callback</h1>, getParentRoute: () => root, path: ROUTES.AUTH.CALLBACK })
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const router = createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [`${ROUTES.AUTH.VERIFY_EMAIL}${search}`] }),
    rewrite: { input: ({ url }) => deLocalizeUrl(url), output: ({ url }) => localizeUrl(url) },
    routeTree: root.addChildren([VerifyEmailRoute, callback]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale={locale} messages={getTestMessages(locale)}>
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { queryClient, router, user: userEvent.setup({ delay: null }) }
}

const resendButton = (name: string) => screen.findByRole("button", { name: new RegExp(`^${name}`, "u") })

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {})
  sessionRequest.mockReset().mockResolvedValue(JSON_NULL)
  resendMock.mockReset().mockResolvedValue({ sent: true })
  changeEmailMock.mockReset().mockResolvedValue({ status: true })
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("verify email page, signed out", () => {
  it("names the address the link went to, leads with resend and keeps the return path on the way back to sign in", async () => {
    await renderVerifyEmail({ search: `?email=${encodeURIComponent(TEST_EMAIL)}&redirect=${encodeURIComponent(RETURN_TO)}` })

    expect(await screen.findByRole("heading", { level: 1, name: messages.pending.title })).toBeVisible()
    expect(screen.getByText(TEST_EMAIL, { selector: "strong" })).toBeVisible()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(await resendButton(messages.pending.send)).toHaveAttribute("data-variant", "default")
    expect(screen.getByRole("button", { name: messages.form.useDifferentEmail })).toBeVisible()
    expect(screen.getByRole("link", { name: messages.form.backToSignIn })).toHaveAttribute(
      "href",
      `${ROUTES.AUTH.SIGN_IN}?email=${encodeURIComponent(TEST_EMAIL)}&redirect=${encodeURIComponent(RETURN_TO)}`,
    )
    expect(resendMock).not.toHaveBeenCalled()
  })

  it("sends one new link with the return path, then counts down before it lets the visitor send another", async () => {
    const pending = Promise.withResolvers<{ sent: true }>()
    resendMock.mockReturnValue(pending.promise)
    const { user } = await renderVerifyEmail({
      search: `?email=${encodeURIComponent(` ${TEST_EMAIL} `)}&redirect=${encodeURIComponent(RETURN_TO)}`,
    })

    await user.click(await resendButton(messages.pending.send))
    await user.click(await resendButton(messages.pending.send))
    await act(async () => {
      pending.resolve({ sent: true })
      await pending.promise
    })

    expect(resendMock).toHaveBeenCalledExactlyOnceWith(
      { callbackURL: `${ROUTES.AUTH.CALLBACK}?redirect=${encodeURIComponent(RETURN_TO)}`, email: TEST_EMAIL },
      expect.anything(),
    )
    expect(await screen.findByRole("status")).toHaveTextContent(resendMessages.sentIfAccount.replace("{email}", TEST_EMAIL))
    const waiting = await resendButton(messages.pending.send)
    expect(waiting).toBeDisabled()
    expect(waiting).toHaveTextContent(`${String(RESEND_COOLDOWN_SECONDS / 60)}:00`)
  })

  it("says plainly when the hourly limit stopped a send, and when the visitor can try again", async () => {
    resendMock.mockResolvedValue({ retryAfterSeconds: 1200, sent: false })
    const { user } = await renderVerifyEmail({ search: `?email=${encodeURIComponent(TEST_EMAIL)}` })

    await user.click(await resendButton(messages.pending.send))

    const status = await screen.findByRole("status")
    await waitFor(() => {
      expect(status).toHaveTextContent(`We've sent ${String(RECIPIENT_EMAILS_PER_HOUR)} links to this address in the last hour`)
    })
    expect(status).not.toHaveTextContent(resendMessages.sentIfAccount.replace("{email}", TEST_EMAIL))
    expect(await resendButton(messages.pending.send)).toHaveTextContent("20:00")
  })

  it("lets the visitor retry a failed send instead of starting a countdown", async () => {
    resendMock.mockRejectedValueOnce(new Error("Email delivery failed"))
    const { user } = await renderVerifyEmail({ search: `?email=${encodeURIComponent(TEST_EMAIL)}` })

    await user.click(await resendButton(messages.pending.send))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    await user.click(await resendButton(messages.pending.send))

    await waitFor(() => {
      expect(resendMock).toHaveBeenCalledTimes(2)
    })
  })

  it("swaps the address for a typed one when the visitor uses a different email", async () => {
    const { user } = await renderVerifyEmail({ search: `?email=${encodeURIComponent(TEST_EMAIL)}` })

    await user.click(await screen.findByRole("button", { name: messages.form.useDifferentEmail }))
    const field = screen.getByRole("textbox", { name: messages.form.email })
    expect(field).toHaveValue("")
    expect(screen.queryByRole("button", { name: messages.form.useDifferentEmail })).not.toBeInTheDocument()
    await user.type(field, NEW_EMAIL)
    await user.click(await resendButton(messages.pending.send))

    await waitFor(() => {
      expect(resendMock).toHaveBeenCalledExactlyOnceWith({ callbackURL: ROUTES.AUTH.CALLBACK, email: NEW_EMAIL }, expect.anything())
    })
  })

  it("asks a visitor without an address for one and refuses an invalid one", async () => {
    const { user } = await renderVerifyEmail()

    expect(
      await screen.findByText(messages.pending.askEmail.replace("{hours, plural, one {# hour} other {# hours}}", "1 hour")),
    ).toBeVisible()
    await user.click(await resendButton(messages.pending.send))
    expect(await screen.findByRole("alert")).toHaveTextContent(authValidationsMessages.emailInvalid)
    await user.type(screen.getByRole("textbox", { name: messages.form.email }), "not-an-address")
    await user.click(await resendButton(messages.pending.send))

    expect(resendMock).not.toHaveBeenCalled()
  })

  it("offers a new link for an expired or used one, to the address it was sent to", async () => {
    const { user } = await renderVerifyEmail({ search: `?error=TOKEN_EXPIRED&email=${encodeURIComponent(TEST_EMAIL)}` })

    expect(await screen.findByRole("heading", { level: 1, name: messages.invalid.title })).toBeVisible()
    expect(screen.getByText(TEST_EMAIL, { selector: "strong" })).toBeVisible()
    await user.click(await resendButton(messages.invalid.send))

    await waitFor(() => {
      expect(resendMock).toHaveBeenCalledExactlyOnceWith({ callbackURL: ROUTES.AUTH.CALLBACK, email: TEST_EMAIL }, expect.anything())
    })
  })

  it("asks for the address when an expired link carried none", async () => {
    await renderVerifyEmail({ search: "?error=INVALID_TOKEN" })

    expect(await screen.findByText(messages.invalid.askEmail)).toBeVisible()
    expect(screen.getByRole("textbox", { name: messages.form.email })).toBeVisible()
  })

  it("tells a visitor whose address is already confirmed to sign in, with the address and the return path", async () => {
    await renderVerifyEmail({ search: `?verified=true&email=${encodeURIComponent(TEST_EMAIL)}&redirect=${encodeURIComponent(RETURN_TO)}` })

    expect(await screen.findByRole("heading", { level: 1, name: messages.confirmed.title })).toBeVisible()
    expect(screen.getByText(messages.confirmed.description)).toBeVisible()
    expect(screen.getByRole("link", { name: messages.confirmed.signIn })).toHaveAttribute(
      "href",
      `${ROUTES.AUTH.SIGN_IN}?email=${encodeURIComponent(TEST_EMAIL)}&redirect=${encodeURIComponent(RETURN_TO)}`,
    )
    expect(screen.queryByRole("button", { name: /resend/iu })).not.toBeInTheDocument()
  })

  it("keeps the selected locale on the way back to sign in", async () => {
    await renderVerifyEmail({ locale: "pl-PL", search: `?email=${encodeURIComponent(TEST_EMAIL)}` })

    expect(await screen.findByRole("link", { name: plPagesAuthVerifyEmailMessages.form.backToSignIn })).toHaveAttribute(
      "href",
      `/pl-PL${ROUTES.AUTH.SIGN_IN}?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
  })
})

describe("verify email page, signed in", () => {
  it("names the account's address, sends to it and offers no way back to sign in", async () => {
    sessionRequest.mockResolvedValue(unverifiedSession())
    const { user } = await renderVerifyEmail({ search: "?email=someone-else%40example.com" })

    expect(await screen.findByText(TEST_EMAIL, { selector: "strong" })).toBeVisible()
    expect(screen.queryByRole("link", { name: messages.form.backToSignIn })).not.toBeInTheDocument()
    await user.click(await resendButton(messages.pending.send))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(resendMessages.sent.replace("{email}", TEST_EMAIL))
    })
    expect(resendMock).toHaveBeenCalledExactlyOnceWith({ callbackURL: ROUTES.AUTH.CALLBACK, email: TEST_EMAIL }, expect.anything())
  })

  it("moves the account to a different address and shows it", async () => {
    sessionRequest.mockResolvedValue(unverifiedSession())
    const { user } = await renderVerifyEmail()

    await user.click(await screen.findByRole("button", { name: messages.form.useDifferentEmail }))
    sessionRequest.mockResolvedValue(unverifiedSession(NEW_EMAIL))
    await user.type(screen.getByRole("textbox", { name: changeEmailMessages.label }), NEW_EMAIL)
    await user.click(screen.getByRole("button", { name: changeEmailMessages.submit }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(changeEmailMessages.changed.replace("{email}", NEW_EMAIL))
    })
    expect(changeEmailMock).toHaveBeenCalledExactlyOnceWith({ callbackURL: ROUTES.AUTH.CALLBACK, newEmail: NEW_EMAIL }, expect.anything())
    expect(await screen.findByText(NEW_EMAIL, { selector: "strong" })).toBeVisible()
  })

  it("continues to the return path by itself once the link is opened elsewhere", async () => {
    sessionRequest.mockResolvedValue(unverifiedSession())
    const { queryClient, router } = await renderVerifyEmail({ search: `?redirect=${encodeURIComponent(RETURN_TO)}` })
    expect(await screen.findByText(TEST_EMAIL, { selector: "strong" })).toBeVisible()

    sessionRequest.mockResolvedValue(createAuthSessionFixture())
    await act(() => queryClient.invalidateQueries({ queryKey: getCurrentSessionQuery.queryKey }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.AUTH.CALLBACK)
    })
    expect(router.state.location.search).toEqual({ redirect: RETURN_TO })
  })
})
