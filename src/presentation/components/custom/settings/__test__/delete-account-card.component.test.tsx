import { act, screen, waitFor, within } from "@testing-library/react"
import type userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { createTranslator } from "use-intl"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { EMAIL_LINK_LIFETIME_HOURS } from "~/src/integrations/better-auth/auth.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type * as RequestAccountDeletionUseCase from "~/src/modules/user/use-cases/request-account-deletion"
import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

import { GITHUB_ACCOUNT, renderSettings, settingsSession } from "~/src/presentation/components/custom/settings/__test__/fixtures"
import { ACCOUNT_DELETION_NOTICES, DeleteAccountCard } from "~/src/presentation/components/custom/settings/delete-account-card"

import authSecurityMessages from "~/messages/en-US/auth.security.json"
import authValidationsMessages from "~/messages/en-US/auth.validations.json"
import errorsMessages from "~/messages/en-US/errors.json"
import { ROUTES } from "~/src/routes"

type Requested = Awaited<ReturnType<NonNullable<typeof RequestAccountDeletionUseCase.requestAccountDeletionMutation.mutationFn>>>

const requestDeletionMock = vi.hoisted(() =>
  vi.fn<NonNullable<typeof RequestAccountDeletionUseCase.requestAccountDeletionMutation.mutationFn>>(),
)

vi.mock(import("~/src/modules/user/use-cases/request-account-deletion"), () => ({
  requestAccountDeletionMutation: { mutationFn: requestDeletionMock, mutationKey: USER_MUTATION_KEYS.REQUEST_ACCOUNT_DELETION },
}))

const labels = authSecurityMessages.delete
const PASSWORD = "SecretPass1!"
const REQUESTED: Requested = { message: "Verification email sent", success: true }

const t = createTranslator({
  locale: "en-US",
  messages: { auth: { security: authSecurityMessages } },
  namespace: "auth.security.delete",
  timeZone: I18N.DEFAULT_TIMEZONE,
})

const noticeText = (key: string): string => `What the ${key} notice says`

const sentMessage = (email: string): string => t("sent", { email, hours: EMAIL_LINK_LIFETIME_HOURS })

const openDialog = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
  await user.click(screen.getByRole("button", { name: labels.start }))
  return screen.getByRole("dialog")
}

const sendWithPassword = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
  const dialog = await openDialog(user)
  await user.click(within(dialog).getByLabelText(labels.password))
  await user.paste(PASSWORD)
  await user.click(within(dialog).getByRole("button", { name: labels.send }))
  return dialog
}

beforeEach(() => {
  requestDeletionMock.mockReset().mockResolvedValue(REQUESTED)
  vi.spyOn(toast, "error").mockReturnValue(0)
  for (const notice of ACCOUNT_DELETION_NOTICES) {
    vi.spyOn(notice, "Notice").mockImplementation(() => <li>{noticeText(notice.key)}</li>)
  }
})

describe("delete account card", () => {
  it("lists what deletion removes, then what each notice says about it", () => {
    renderSettings(<DeleteAccountCard />)

    expect(screen.getByRole("heading", { name: labels.title })).toBeVisible()
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual([
      labels.consequences,
      ...ACCOUNT_DELETION_NOTICES.map(({ key }) => noticeText(key)),
    ])
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("asks for the password of an account that has one and emails the confirmation link", async () => {
    const session = settingsSession()
    const { user } = renderSettings(<DeleteAccountCard />, { session })
    const dialog = await openDialog(user)

    expect(within(dialog).getByRole("heading", { name: labels.dialogTitle })).toBeVisible()
    expect(within(dialog).getByText(labels.dialogDescription)).toBeVisible()
    await user.click(within(dialog).getByRole("button", { name: labels.send }))
    expect(await within(dialog).findByText(authValidationsMessages.passwordRequired)).toBeVisible()
    expect(requestDeletionMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByLabelText(labels.password))
    await user.paste(PASSWORD)
    await user.click(within(dialog).getByRole("button", { name: labels.send }))

    expect(await screen.findByRole("status")).toHaveTextContent(sentMessage(session.user.email))
    expect(requestDeletionMock).toHaveBeenCalledExactlyOnceWith(
      { callbackURL: ROUTES.APP.SETTINGS.DELETE_ACCOUNT, password: PASSWORD },
      expect.anything(),
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("asks an account that signs in only with a provider for no password", async () => {
    const { user } = renderSettings(<DeleteAccountCard />, { accounts: [GITHUB_ACCOUNT] })
    const dialog = await openDialog(user)

    expect(within(dialog).queryByLabelText(labels.password)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: labels.send }))

    expect(await screen.findByRole("status")).toBeVisible()
    expect(requestDeletionMock).toHaveBeenCalledExactlyOnceWith({ callbackURL: ROUTES.APP.SETTINGS.DELETE_ACCOUNT }, expect.anything())
  })

  it("shows the request as under way until it settles", async () => {
    const pending = Promise.withResolvers<Requested>()
    requestDeletionMock.mockReturnValueOnce(pending.promise)
    const { user } = renderSettings(<DeleteAccountCard />)
    const dialog = await sendWithPassword(user)

    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: labels.send })).toHaveAttribute("aria-disabled", "true")
    })
    await act(async () => {
      pending.resolve(REQUESTED)
      await pending.promise
    })
    expect(await screen.findByRole("status")).toBeVisible()
  })

  it("reports a failed request and keeps the dialog open", async () => {
    requestDeletionMock.mockRejectedValueOnce(new Error("Network unavailable"))
    const { user } = renderSettings(<DeleteAccountCard />)
    const dialog = await sendWithPassword(user)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(dialog).toBeVisible()
    expect(within(dialog).getByLabelText(labels.password)).toHaveValue(PASSWORD)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("closes on cancel without sending anything", async () => {
    const { user } = renderSettings(<DeleteAccountCard />)
    const dialog = await openDialog(user)
    await user.click(within(dialog).getByRole("button", { name: labels.cancel }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(requestDeletionMock).not.toHaveBeenCalled()
  })

  it("names no address when the session is gone", async () => {
    const { user } = renderSettings(<DeleteAccountCard />, { session: null })
    await sendWithPassword(user)

    expect(await screen.findByRole("status")).toHaveTextContent(sentMessage(""))
  })
})
