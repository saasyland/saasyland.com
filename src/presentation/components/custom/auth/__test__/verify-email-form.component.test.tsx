import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { deLocalizeUrl, localizeUrl } from "~/src/integrations/use-intl/i18n.utils"

import type { sendVerificationEmailMutation } from "~/src/modules/verification/use-cases/send-verification-email"
import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"

import { Route as VerifyEmailRoute } from "~/src/routes/auth.verify-email"

import authValidationsMessages from "~/messages/en-US/auth.validations.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesAuthVerifyEmailMessages from "~/messages/en-US/pages.auth.verify-email.json"
import plPagesAuthVerifyEmailMessages from "~/messages/pl-PL/pages.auth.verify-email.json"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

const TEST_EMAIL = "user@example.com"
const formMessages = pagesAuthVerifyEmailMessages.form
const resendMock = vi.hoisted(() => vi.fn<NonNullable<typeof sendVerificationEmailMutation.mutationFn>>())

vi.mock(import("~/src/modules/verification/use-cases/send-verification-email"), () => ({
  sendVerificationEmailMutation: { mutationFn: resendMock, mutationKey: VERIFICATION_MUTATION_KEYS.SEND_EMAIL },
}))

const renderVerifyEmail = async ({ locale = "en-US", search = "" }: Readonly<{ locale?: SupportedLocale; search?: string }> = {}) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${localizePathname({ locale, pathname: ROUTES.VERIFY_EMAIL })}`))
  const root = createRootRouteWithContext<RouterContext>()()
  Object.assign(VerifyEmailRoute.options, { getParentRoute: () => root, id: ROUTES.VERIFY_EMAIL, path: ROUTES.VERIFY_EMAIL })
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const router = createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [`${ROUTES.VERIFY_EMAIL}${search}`] }),
    rewrite: { input: ({ url }) => deLocalizeUrl(url), output: ({ url }) => localizeUrl(url) },
    routeTree: root.addChildren([VerifyEmailRoute]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale={locale} messages={getTestMessages(locale)}>
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { queryClient, user: userEvent.setup() }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {})
  resendMock.mockResolvedValue({ status: true })
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("verify email form", () => {
  it("leads with a sign-in link and keeps resend as a text action without asking for the signup email again", async () => {
    await renderVerifyEmail({ search: `?email=${encodeURIComponent(TEST_EMAIL)}` })
    const signIn = await screen.findByRole("link", { name: formMessages.backToSignIn })
    const resend = screen.getByRole("button", { name: formMessages.resend })

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(signIn).toHaveAttribute("href", ROUTES.SIGN_IN)
    expect(resend).toHaveAttribute("data-variant", "link")
    expect(resendMock).not.toHaveBeenCalled()
  })

  it("resends to the signup address once and shows progress until the request finishes", async () => {
    const pending = Promise.withResolvers<{ status: boolean }>()
    resendMock.mockReturnValue(pending.promise)
    const { queryClient, user } = await renderVerifyEmail({ search: `?email=${encodeURIComponent(` ${TEST_EMAIL} `)}` })
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture())

    await user.click(await screen.findByRole("button", { name: formMessages.resend }))
    const resending = await screen.findByRole("button", { name: formMessages.resending })
    expect(resending).toHaveAttribute("aria-disabled", "true")
    await user.click(resending)
    const form = resending.closest("form")
    expect(form).not.toBeNull()
    if (form) {
      fireEvent.submit(form)
    }
    expect(resendMock).toHaveBeenCalledExactlyOnceWith({ callbackURL: ROUTES.AUTH_CALLBACK, email: TEST_EMAIL }, expect.anything())

    await act(async () => {
      pending.resolve({ status: true })
      await pending.promise
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: formMessages.resend })).not.toHaveAttribute("aria-disabled")
    })
    expect(toast.success).toHaveBeenCalledWith(formMessages.resendSuccess)
    expect(queryClient.getQueryState(getCurrentSessionQuery.queryKey)?.isInvalidated).toBe(false)
  })

  it("preserves the selected locale for sign in and resend and treats a blank address as missing", async () => {
    const { user } = await renderVerifyEmail({ locale: "pl-PL", search: "?email=%20" })
    const polishFormMessages = plPagesAuthVerifyEmailMessages.form

    expect(await screen.findByRole("link", { name: polishFormMessages.backToSignIn })).toHaveAttribute("href", `/pl-PL${ROUTES.SIGN_IN}`)
    await user.type(screen.getByRole("textbox", { name: polishFormMessages.email }), TEST_EMAIL)
    await user.click(screen.getByRole("button", { name: polishFormMessages.resend }))
    await waitFor(() => {
      expect(resendMock).toHaveBeenCalledExactlyOnceWith(
        { callbackURL: `/pl-PL${ROUTES.AUTH_CALLBACK}`, email: TEST_EMAIL },
        expect.anything(),
      )
    })
  })

  it("asks someone visiting without an email to provide one before resending", async () => {
    const { user } = await renderVerifyEmail()
    const resend = await screen.findByRole("button", { name: formMessages.resend })

    await user.click(resend)
    expect(await screen.findByRole("alert")).toHaveTextContent(authValidationsMessages.emailInvalid)
    expect(screen.getByRole("textbox", { name: formMessages.email })).toHaveAttribute("aria-invalid", "true")
    expect(resendMock).not.toHaveBeenCalled()

    await user.type(screen.getByRole("textbox", { name: formMessages.email }), TEST_EMAIL)
    await user.click(resend)
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(formMessages.resendSuccess)
    })
    expect(resendMock).toHaveBeenCalledExactlyOnceWith({ callbackURL: ROUTES.AUTH_CALLBACK, email: TEST_EMAIL }, expect.anything())
  })

  it("blocks malformed email addresses before resending", async () => {
    const { user } = await renderVerifyEmail()
    const email = await screen.findByRole("textbox", { name: formMessages.email })

    await user.type(email, "invalid-address")
    await user.click(screen.getByRole("button", { name: formMessages.resend }))

    expect(email).toBeInvalid()
    expect(resendMock).not.toHaveBeenCalled()
  })

  it("allows recovery from an invalid verification link by entering an email", async () => {
    const { user } = await renderVerifyEmail({ search: "?error=INVALID_TOKEN" })

    expect(await screen.findByText(formMessages.invalidToken)).toBeVisible()
    expect(screen.getByRole("link", { name: formMessages.backToSignIn })).toHaveAttribute("href", ROUTES.SIGN_IN)
    await user.type(screen.getByRole("textbox", { name: formMessages.email }), TEST_EMAIL)
    await user.click(screen.getByRole("button", { name: formMessages.resend }))
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(formMessages.resendSuccess)
    })
  })

  it("lets the user retry a failed resend instead of leaving the action disabled", async () => {
    resendMock.mockRejectedValueOnce(new Error("Email delivery failed"))
    const { user } = await renderVerifyEmail({ search: `?email=${encodeURIComponent(TEST_EMAIL)}` })

    await user.click(await screen.findByRole("button", { name: formMessages.resend }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(screen.getByRole("button", { name: formMessages.resend })).not.toHaveAttribute("aria-disabled")
    await user.click(screen.getByRole("button", { name: formMessages.resend }))
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(formMessages.resendSuccess)
    })
    expect(resendMock).toHaveBeenCalledTimes(2)
  })
})
