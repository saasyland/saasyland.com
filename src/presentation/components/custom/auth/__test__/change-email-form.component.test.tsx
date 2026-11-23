import { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type * as ChangeEmailUseCase from "~/src/modules/account/use-cases/change-email"

import { SETTINGS_TAB } from "~/src/data/auth"

import { ChangeEmailForm } from "~/src/presentation/components/custom/auth/change-email-form"

import changeEmailMessages from "~/messages/en-US/components.custom.change-email-form.json"
import errorsMessages from "~/messages/en-US/errors.json"
import * as ROUTES from "~/src/routes"

type Changed = Awaited<ReturnType<NonNullable<typeof ChangeEmailUseCase.changeEmailMutation.mutationFn>>>
type Session = ReturnType<typeof createAuthSessionFixture>

const sessionRequest = vi.hoisted(() => vi.fn<() => Promise<Session | null>>())
const changeEmailMock = vi.hoisted(() => vi.fn<NonNullable<typeof ChangeEmailUseCase.changeEmailMutation.mutationFn>>())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})
vi.mock(import("~/src/modules/account/use-cases/change-email"), () => ({
  changeEmailMutation: { mutationFn: changeEmailMock, mutationKey: ACCOUNT_MUTATION_KEYS.CHANGE_EMAIL },
}))

const messages = getTestMessages("en-US")
const NEW_EMAIL = "new@example.com"
const CHANGED: Changed = { status: true }
const SETTINGS_PAGE = `${ROUTES.APP_SETTINGS}?tab=${SETTINGS_TAB.GENERAL}`

const sessionWith = ({ email = createAuthSessionFixture().user.email, emailVerified = true } = {}): Session => {
  const session = createAuthSessionFixture()
  return { ...session, user: { ...session.user, email, emailVerified } }
}

const renderForm = (session: Session | null, path = SETTINGS_PAGE) => {
  const onDone = vi.fn<() => void>()
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  renderWithRouter(
    <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
      <ChangeEmailForm onDone={onDone} />
    </IntlProvider>,
    { queryClient, router: createTestRouter(path) },
  )
  return { onDone, user: userEvent.setup({ delay: null }) }
}

const submit = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.click(screen.getByRole("textbox", { name: changeEmailMessages.label }))
  await user.paste(NEW_EMAIL)
  await user.click(screen.getByRole("button", { name: changeEmailMessages.submit }))
}

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(sessionWith({ email: NEW_EMAIL, emailVerified: false }))
  changeEmailMock.mockReset().mockResolvedValue(CHANGED)
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("changing a verified address", () => {
  it("asks the current address to confirm, returning to the current page", async () => {
    const session = sessionWith()
    const { onDone, user } = renderForm(session)
    await submit(user)

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce()
    })
    expect(changeEmailMock).toHaveBeenCalledExactlyOnceWith(
      { callbackURL: `${ROUTES.AUTH_CALLBACK}?redirect=${encodeURIComponent(SETTINGS_PAGE)}`, newEmail: NEW_EMAIL },
      expect.anything(),
    )
    expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      changeEmailMessages.confirmationSent.replaceAll("{newEmail}", NEW_EMAIL).replace("{email}", session.user.email),
    )
    expect(sessionRequest).not.toHaveBeenCalled()
  })

  it("shows the request as under way until it settles", async () => {
    const pending = Promise.withResolvers<Changed>()
    changeEmailMock.mockReturnValueOnce(pending.promise)
    const { onDone, user } = renderForm(sessionWith())
    await submit(user)

    const submitting = await screen.findByRole("button", { name: changeEmailMessages.submitting })
    expect(submitting).toHaveAttribute("aria-disabled", "true")
    expect(submitting.querySelector(".animate-spin")).toBeInTheDocument()
    await act(async () => {
      pending.resolve(CHANGED)
      await pending.promise
    })
    expect(onDone).toHaveBeenCalledOnce()
  })

  it("keeps the form open when the request fails", async () => {
    changeEmailMock.mockRejectedValueOnce(new Error("Unavailable"))
    const { onDone, user } = renderForm(sessionWith())
    await submit(user)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByRole("textbox", { name: changeEmailMessages.label })).toHaveValue(NEW_EMAIL)
  })
})

describe("changing an unverified address", () => {
  it("moves the account at once and keeps the page's own redirect in the link", async () => {
    const { onDone, user } = renderForm(sessionWith({ emailVerified: false }), `${ROUTES.VERIFY_EMAIL}?redirect=${ROUTES.APP}`)
    await submit(user)

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce()
    })
    expect(changeEmailMock).toHaveBeenCalledExactlyOnceWith(
      { callbackURL: `${ROUTES.AUTH_CALLBACK}?redirect=${encodeURIComponent(ROUTES.APP)}`, newEmail: NEW_EMAIL },
      expect.anything(),
    )
    expect(toast.success).toHaveBeenCalledExactlyOnceWith(changeEmailMessages.changed.replace("{email}", NEW_EMAIL))
  })

  it("says the move failed when the session is gone afterwards", async () => {
    sessionRequest.mockResolvedValueOnce(null)
    const { onDone, user } = renderForm(null)
    await submit(user)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(changeEmailMessages.unchanged.replace("{email}", NEW_EMAIL))
    })
    expect(changeEmailMock).toHaveBeenCalledExactlyOnceWith({ callbackURL: ROUTES.AUTH_CALLBACK, newEmail: NEW_EMAIL }, expect.anything())
    expect(onDone).not.toHaveBeenCalled()
  })
})
