import { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type * as ChangeEmailUseCase from "~/src/modules/account/use-cases/change-email"
import { LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"
import type * as SendVerificationEmailUseCase from "~/src/modules/verification/use-cases/send-verification-email"
import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"

import { EmailVerificationBanner } from "~/src/presentation/components/custom/app/email-verification-banner"

import authValidationsMessages from "~/messages/en-US/auth.validations.json"
import changeEmailMessages from "~/messages/en-US/components.custom.change-email-form.json"
import resendMessages from "~/messages/en-US/components.custom.email-link-resend.json"
import messages from "~/messages/en-US/components.custom.email-verification-banner.json"
import errorsMessages from "~/messages/en-US/errors.json"
import * as ROUTES from "~/src/routes"

const NEW_EMAIL = "new@example.com"

const sessionRequest = vi.hoisted(() => vi.fn())
const resendMock = vi.hoisted(() => vi.fn<NonNullable<typeof SendVerificationEmailUseCase.sendVerificationEmailMutation.mutationFn>>())
const changeEmailMock = vi.hoisted(() => vi.fn<NonNullable<typeof ChangeEmailUseCase.changeEmailMutation.mutationFn>>())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})

vi.mock(import("~/src/modules/verification/use-cases/send-verification-email"), () => ({
  sendVerificationEmailMutation: { mutationFn: resendMock, mutationKey: VERIFICATION_MUTATION_KEYS.SEND_EMAIL },
}))

vi.mock(import("~/src/modules/account/use-cases/change-email"), () => ({
  changeEmailMutation: { mutationFn: changeEmailMock, mutationKey: ACCOUNT_MUTATION_KEYS.CHANGE_EMAIL },
}))

const confirmedSession = createAuthSessionFixture()

const unconfirmedSession = (email = confirmedSession.user.email) => ({
  ...confirmedSession,
  user: { ...confirmedSession.user, email, emailVerified: false },
})

const renderBanner = (session: typeof confirmedSession | null) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  queryClient.setQueryData(LICENSE_QUERY_KEYS.KEY, { key: undefined })
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <EmailVerificationBanner />
    </IntlProvider>,
    { queryClient },
  )
  return { queryClient, user: userEvent.setup({ delay: null }) }
}

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(unconfirmedSession())
  resendMock.mockReset().mockResolvedValue({ sent: true })
  changeEmailMock.mockReset().mockResolvedValue({ status: true })
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("email verification banner", () => {
  it("shows nothing to a customer whose email is confirmed, or to nobody signed in", () => {
    renderBanner(confirmedSession)
    expect(screen.queryByRole("region")).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("shows nothing when the session is gone", () => {
    renderBanner(JSON_NULL)
    expect(screen.queryByRole("region")).toBeNull()
  })

  it("names the address the link went to and resends it to that address", async () => {
    const { user } = renderBanner(unconfirmedSession())
    const banner = screen.getByRole("region", { name: messages.title })

    expect(within(banner).getByText(confirmedSession.user.email, { selector: "strong" })).toBeVisible()
    await user.click(within(banner).getByRole("button", { name: new RegExp(`^${messages.resend}`, "u") }))

    await waitFor(() => {
      expect(within(banner).getByRole("status")).toHaveTextContent(resendMessages.sent.replace("{email}", confirmedSession.user.email))
    })
    expect(resendMock).toHaveBeenCalledExactlyOnceWith(
      { callbackURL: ROUTES.AUTH_CALLBACK, email: confirmedSession.user.email },
      expect.anything(),
    )
  })

  it("moves the account to a different address and names the new one", async () => {
    const { user } = renderBanner(unconfirmedSession())

    await user.click(screen.getByRole("button", { name: messages.change }))
    sessionRequest.mockResolvedValue(unconfirmedSession(NEW_EMAIL))
    await user.type(screen.getByRole("textbox", { name: changeEmailMessages.label }), NEW_EMAIL)
    await user.click(screen.getByRole("button", { name: changeEmailMessages.submit }))

    expect(await screen.findByText(NEW_EMAIL, { selector: "strong" })).toBeVisible()
    expect(toast.success).toHaveBeenCalledWith(changeEmailMessages.changed.replace("{email}", NEW_EMAIL))
    expect(screen.queryByRole("textbox", { name: changeEmailMessages.label })).toBeNull()
  })

  it("shows the move to a new address as under way until it settles", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof changeEmailMock>>>()
    changeEmailMock.mockReturnValueOnce(pending.promise)
    const { user } = renderBanner(unconfirmedSession())

    await user.click(screen.getByRole("button", { name: messages.change }))
    await user.type(screen.getByRole("textbox", { name: changeEmailMessages.label }), NEW_EMAIL)
    await user.click(screen.getByRole("button", { name: changeEmailMessages.submit }))

    const submitting = await screen.findByRole("button", { name: changeEmailMessages.submitting })
    expect(submitting).toHaveAttribute("aria-disabled", "true")
    expect(submitting.querySelector(".animate-spin")).toBeInTheDocument()

    sessionRequest.mockResolvedValue(unconfirmedSession(NEW_EMAIL))
    await act(async () => {
      pending.resolve({ status: true })
      await pending.promise
    })
    expect(await screen.findByText(NEW_EMAIL, { selector: "strong" })).toBeVisible()
  })

  it("says so when the account could not move to the address, and keeps the form open", async () => {
    const { user } = renderBanner(unconfirmedSession())

    await user.click(screen.getByRole("button", { name: messages.change }))
    await user.type(screen.getByRole("textbox", { name: changeEmailMessages.label }), NEW_EMAIL)
    await user.click(screen.getByRole("button", { name: changeEmailMessages.submit }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(changeEmailMessages.unchanged.replace("{email}", NEW_EMAIL))
    })
    expect(screen.getByRole("textbox", { name: changeEmailMessages.label })).toBeVisible()
  })

  it("reports a failed change, refuses an invalid address, and goes back to resend on cancel", async () => {
    changeEmailMock.mockRejectedValueOnce(new Error("Unavailable"))
    const { user } = renderBanner(unconfirmedSession())

    await user.click(screen.getByRole("button", { name: messages.change }))
    await user.click(screen.getByRole("button", { name: changeEmailMessages.submit }))
    expect(await screen.findByRole("alert")).toHaveTextContent(authValidationsMessages.emailInvalid)
    await user.type(screen.getByRole("textbox", { name: changeEmailMessages.label }), NEW_EMAIL)
    await user.click(screen.getByRole("button", { name: changeEmailMessages.submit }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    await user.click(screen.getByRole("button", { name: changeEmailMessages.cancel }))

    expect(screen.getByRole("button", { name: new RegExp(`^${messages.resend}`, "u") })).toBeVisible()
  })

  it("notices the link was opened elsewhere, says the address is confirmed and refreshes what it unlocks", async () => {
    const { queryClient } = renderBanner(unconfirmedSession())
    expect(screen.getByRole("region", { name: messages.title })).toBeVisible()

    sessionRequest.mockResolvedValue(confirmedSession)
    await act(() => queryClient.invalidateQueries({ queryKey: getCurrentSessionQuery.queryKey }))

    expect(await screen.findByText(messages.confirmed)).toHaveAttribute("role", "status")
    expect(screen.queryByRole("region", { name: messages.title })).toBeNull()
    await waitFor(() => {
      expect(queryClient.getQueryState(LICENSE_QUERY_KEYS.KEY)?.isInvalidated).toBe(true)
    })
  })
})
