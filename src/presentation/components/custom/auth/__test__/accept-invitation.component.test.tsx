import { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { createTranslator } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import type * as AuthClient from "~/src/integrations/better-auth/auth.client"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type { signOutUserMutation } from "~/src/modules/account/use-cases/sign-out-user"
import {
  INVITATION_MUTATION_KEYS,
  INVITATION_STATUS,
  INVITATION_TOKEN_LENGTH,
  type InvitationStatus,
} from "~/src/modules/invitation/invitation.constants"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import type { acceptInvitationMutation } from "~/src/modules/invitation/use-cases/accept-invitation"
import type { claimInvitationMutation } from "~/src/modules/invitation/use-cases/claim-invitation"
import { invitationQuery } from "~/src/modules/invitation/use-cases/get-invitation"

import { Route as InviteRoute } from "~/src/routes/auth.invite"

import authOauthMessages from "~/messages/en-US/auth.oauth.json"
import authValidationMessages from "~/messages/en-US/auth.validations.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesAuthInviteMessages from "~/messages/en-US/pages.auth.invite.json"
import { APP_NAME } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

type Session = ReturnType<typeof createAuthSessionFixture> | null
type User = ReturnType<typeof userEvent.setup>

const invitationRequest = vi.hoisted(() => vi.fn<() => Promise<Invitation["link"]>>())
const sessionRequest = vi.hoisted(() => vi.fn<() => Promise<Session>>())
const accept = vi.hoisted(() => vi.fn<NonNullable<typeof acceptInvitationMutation.mutationFn>>())
const claim = vi.hoisted(() => vi.fn<NonNullable<typeof claimInvitationMutation.mutationFn>>())
const signOut = vi.hoisted(() => vi.fn<NonNullable<typeof signOutUserMutation.mutationFn>>())
const signInSocial = vi.hoisted(() => vi.fn<typeof AuthClient.authClient.signIn.social>())

vi.mock(import("~/src/modules/invitation/use-cases/get-invitation"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    invitationQuery: (data: Invitation["getInvitation"]) => ({ ...actual.invitationQuery(data), queryFn: invitationRequest }),
  }
})
vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})
vi.mock(import("~/src/modules/invitation/use-cases/accept-invitation"), () => ({
  acceptInvitationMutation: { mutationFn: accept, mutationKey: INVITATION_MUTATION_KEYS.ACCEPT },
}))
vi.mock(import("~/src/modules/invitation/use-cases/claim-invitation"), () => ({
  claimInvitationMutation: { mutationFn: claim, mutationKey: INVITATION_MUTATION_KEYS.CLAIM },
}))
vi.mock(import("~/src/modules/account/use-cases/sign-out-user"), () => ({
  signOutUserMutation: { mutationFn: signOut, mutationKey: ACCOUNT_MUTATION_KEYS.SIGN_OUT },
}))
vi.mock(import("~/src/integrations/better-auth/auth.client"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, authClient: { ...actual.authClient, signIn: { ...actual.authClient.signIn, social: signInSocial } } }
})

const labels = pagesAuthInviteMessages
const t = createTranslator({ locale: "en-US", messages: pagesAuthInviteMessages })
const messages = getTestMessages("en-US")
const TOKEN = "a".repeat(INVITATION_TOKEN_LENGTH)
const INVITE_PAGE = `${ROUTES.ACCEPT_INVITATION}?${new URLSearchParams({ token: TOKEN }).toString()}`
const WITH_INVITE_PAGE = new URLSearchParams({ redirect: INVITE_PAGE }).toString()
const NAME = "Grace Hopper"
const PASSWORD = "correct horse battery"
const signedIn = createAuthSessionFixture()
const INVITED = signedIn.user.email
const WELCOME = t("welcome", { appName: APP_NAME })
const SIGN_IN_LINK = /<link>(?<text>[^<]+)<\/link>/u.exec(labels.form.hasAccount)?.groups?.["text"] ?? labels.form.hasAccount

const linkTo = (status: InvitationStatus, email = INVITED): Invitation["link"] => ({
  invitation: { email, role: ROLE_CODES.CUSTOMER, status },
})

const PENDING = linkTo(INVITATION_STATUS.PENDING)

interface InviteOptions {
  readonly link?: Invitation["link"]
  readonly search?: { readonly token?: string }
  readonly session?: Session
}

const renderInvite = ({ link = PENDING, search = { token: TOKEN }, session = null }: InviteOptions = {}) => {
  vi.spyOn(InviteRoute, "useSearch").mockReturnValue(search)
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(invitationQuery({ token: TOKEN }).queryKey, link)
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  invitationRequest.mockResolvedValue(link)
  sessionRequest.mockResolvedValue(session)
  const router = createTestRouter(INVITE_PAGE)
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue()
  const Page = InviteRoute.options.component
  if (!Page) {
    throw new Error("The invite route must provide a page")
  }
  renderWithRouter(
    <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
      <Page />
    </IntlProvider>,
    { queryClient, router },
  )
  return { navigate, user: userEvent.setup({ delay: null }) }
}

const passwordInput = (): HTMLElement => {
  const input = document.querySelector<HTMLElement>("#invite-password")
  if (!input) {
    throw new Error("Missing password input")
  }
  return input
}

const fillForm = async (user: User): Promise<HTMLElement> => {
  await user.click(screen.getByLabelText(labels.form.name))
  await user.paste(NAME)
  await user.click(passwordInput())
  await user.paste(PASSWORD)
  return screen.getByRole("button", { name: labels.form.submit })
}

const expectUnavailable = (title: string, description: string): void => {
  expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible()
  expect(screen.getByText(description)).toBeVisible()
  expect(screen.getByRole("link", { name: labels.signIn })).toHaveAttribute("href", ROUTES.SIGN_IN)
}

beforeEach(() => {
  vi.clearAllMocks()
  accept.mockResolvedValue({ role: ROLE_CODES.CUSTOMER })
  claim.mockResolvedValue({ role: ROLE_CODES.CUSTOMER })
  signOut.mockResolvedValue({ redirect: undefined, success: true, url: undefined })
  signInSocial.mockResolvedValue({ data: { redirect: true, url: "https://github.com/login/oauth" }, error: null })
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("invitation links that do not work", () => {
  it.each([
    ["no token", {}],
    ["a malformed token", { token: "not-a-token" }],
  ])("says a link with %s does not work, without looking it up", (_kind, search) => {
    renderInvite({ search })

    expectUnavailable(labels.invalid.title, labels.invalid.description)
    expect(invitationRequest).not.toHaveBeenCalled()
  })

  it("says a link nobody issued does not work", () => {
    renderInvite({ link: { invitation: undefined } })

    expectUnavailable(labels.invalid.title, labels.invalid.description)
  })

  it.each([INVITATION_STATUS.EXPIRED, INVITATION_STATUS.REVOKED, INVITATION_STATUS.ACCEPTED] as const)(
    "explains an invitation that is %s and offers to sign in",
    (status) => {
      renderInvite({ link: linkTo(status) })

      expectUnavailable(labels[status].title, labels[status].description)
    },
  )
})

describe("a signed-out invitee", () => {
  it("names the invited address and role and keeps every way in on the invitation", () => {
    renderInvite()

    expect(screen.getByRole("heading", { level: 1, name: t("form.title", { appName: APP_NAME }) })).toBeVisible()
    expect(screen.getByText(t("form.description", { email: INVITED, role: labels.roles.customer }))).toBeVisible()
    expect(screen.getByLabelText(labels.form.email)).toHaveValue(INVITED)
    expect(screen.getByLabelText(labels.form.email)).toHaveAttribute("readonly")
    expect(screen.getByRole("link", { name: SIGN_IN_LINK })).toHaveAttribute("href", `${ROUTES.SIGN_IN}?${WITH_INVITE_PAGE}`)
  })

  it("returns to the invitation after signing in with a provider", async () => {
    const { user } = renderInvite()
    await user.click(screen.getByRole("button", { name: authOauthMessages.continueWith.replace("{provider}", "GitHub") }))

    await waitFor(() => {
      expect(signInSocial).toHaveBeenCalledWith(
        expect.objectContaining({
          callbackURL: `${ROUTES.AUTH_CALLBACK}?${WITH_INVITE_PAGE}`,
          errorCallbackURL: `${ROUTES.SIGN_IN}?${WITH_INVITE_PAGE}`,
          provider: AUTH_PROVIDER.GITHUB,
        }),
      )
    })
  })

  it("explains a missing name and password and creates nothing", async () => {
    const { user } = renderInvite()
    await user.click(screen.getByRole("button", { name: labels.form.submit }))

    expect(screen.getByLabelText(labels.form.name)).toHaveFocus()
    expect(screen.getByLabelText(labels.form.name)).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText(authValidationMessages.nameRequired)).toHaveAttribute("id", "invite-name-error")
    expect(screen.getByText(authValidationMessages.passwordRequired)).toHaveAttribute("id", "invite-password-error")
    expect(accept).not.toHaveBeenCalled()
  })

  it("creates the account with the invitation's token, then finishes signing in and welcomes the new user", async () => {
    const { navigate, user } = renderInvite()
    await user.click(await fillForm(user))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(WELCOME)
    })
    expect(accept).toHaveBeenCalledWith({ name: NAME, password: PASSWORD, token: TOKEN }, expect.anything())
    expect(navigate).toHaveBeenCalledWith({ replace: true, search: {}, to: ROUTES.AUTH_CALLBACK })
  })

  it("shows progress and ignores repeat submits until the account is created", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof accept>>>()
    accept.mockReturnValueOnce(pending.promise)
    const { user } = renderInvite()
    const submit = await fillForm(user)
    await user.click(submit)

    expect(submit).toHaveTextContent(labels.form.submitting)
    expect(submit).toHaveAttribute("aria-disabled", "true")
    expect(submit.querySelector(".animate-spin")).toBeInTheDocument()
    await user.click(submit)
    expect(accept).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve({ role: ROLE_CODES.CUSTOMER })
      await pending.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(WELCOME)
    })
  })

  it("shows a password found in a known data breach on the password field", async () => {
    accept.mockRejectedValueOnce(new Error(AUTH_ERRORS.PASSWORD_COMPROMISED))
    const { navigate, user } = renderInvite()
    await user.click(await fillForm(user))

    await waitFor(() => {
      expect(screen.getByText(authValidationMessages.passwordCompromised)).toHaveAttribute("id", "invite-password-error")
    })
    expect(passwordInput()).toHaveAttribute("aria-invalid", "true")
    expect(passwordInput()).toHaveFocus()
    expect(toast.error).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["too many attempts", new AppError(ERROR_CODES.TOO_MANY_REQUESTS), errorsMessages.codes.TOO_MANY_REQUESTS],
  ])("reports %s and looks the invitation up again", async (_kind, error, message) => {
    accept.mockRejectedValueOnce(error)
    const { navigate, user } = renderInvite()
    await user.click(await fillForm(user))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(invitationRequest).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("tells the invitee when the invitation closed while they filled in the form", async () => {
    accept.mockRejectedValueOnce(new AppError(ERROR_CODES.NOT_FOUND))
    const { user } = renderInvite()
    invitationRequest.mockResolvedValue(linkTo(INVITATION_STATUS.REVOKED))
    await user.click(await fillForm(user))

    expect(await screen.findByRole("heading", { level: 1, name: labels.revoked.title })).toBeVisible()
    expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.NOT_FOUND)
  })
})

describe("a signed-in invitee", () => {
  it("accepts the invitation for the invited address in any letter case, then finishes signing in", async () => {
    const { navigate, user } = renderInvite({ session: { ...signedIn, user: { ...signedIn.user, email: INVITED.toUpperCase() } } })
    expect(screen.getByRole("heading", { level: 1, name: labels.claim.title })).toBeVisible()
    expect(screen.getByText(t("claim.description", { email: INVITED, role: labels.roles.customer }))).toBeVisible()
    await user.click(screen.getByRole("button", { name: labels.claim.submit }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(WELCOME)
    })
    expect(claim).toHaveBeenCalledWith({ token: TOKEN }, expect.anything())
    expect(navigate).toHaveBeenCalledWith({ replace: true, search: {}, to: ROUTES.AUTH_CALLBACK })
  })

  it("reports a failed acceptance and shows what became of the invitation", async () => {
    claim.mockRejectedValueOnce(new AppError(ERROR_CODES.NOT_FOUND))
    const { navigate, user } = renderInvite({ session: signedIn })
    invitationRequest.mockResolvedValue(linkTo(INVITATION_STATUS.EXPIRED))
    await user.click(screen.getByRole("button", { name: labels.claim.submit }))

    expect(await screen.findByRole("heading", { level: 1, name: labels.expired.title })).toBeVisible()
    expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.NOT_FOUND)
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe("an invitee signed in with another address", () => {
  const OTHER = "someone-else@example.com"

  it("names both addresses and signs out so the invitation can be accepted with the invited one", async () => {
    const { user } = renderInvite({ link: linkTo(INVITATION_STATUS.PENDING, OTHER), session: signedIn })
    expect(screen.getByRole("heading", { level: 1, name: labels.mismatch.title })).toBeVisible()
    expect(screen.getByText(t("mismatch.description", { current: INVITED, invited: OTHER }))).toBeVisible()
    sessionRequest.mockResolvedValue(null)
    await user.click(screen.getByRole("button", { name: labels.mismatch.signOut }))

    expect(await screen.findByRole("heading", { level: 1, name: t("form.title", { appName: APP_NAME }) })).toBeVisible()
    expect(signOut).toHaveBeenCalledOnce()
    expect(screen.getByLabelText(labels.form.email)).toHaveValue(OTHER)
  })

  it("reports a failed sign-out and stays signed in", async () => {
    signOut.mockRejectedValueOnce(new Error("Unavailable"))
    const { user } = renderInvite({ link: linkTo(INVITATION_STATUS.PENDING, OTHER), session: signedIn })
    await user.click(screen.getByRole("button", { name: labels.mismatch.signOut }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(screen.getByRole("heading", { level: 1, name: labels.mismatch.title })).toBeVisible()
    expect(sessionRequest).not.toHaveBeenCalled()
  })
})
