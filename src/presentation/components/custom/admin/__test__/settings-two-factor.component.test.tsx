import { QueryClient } from "@tanstack/react-query"
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { TWO_FACTOR_MUTATION_KEYS } from "~/src/modules/two-factor/two-factor.constants"
import type { disableTwoFactorMutation } from "~/src/modules/two-factor/use-cases/disable-two-factor"
import type { enableTwoFactorMutation } from "~/src/modules/two-factor/use-cases/enable-two-factor"
import type { verifyTotpMutation } from "~/src/modules/two-factor/use-cases/verify-totp"

import { SettingsTwoFactor } from "~/src/presentation/components/custom/admin/settings/two-factor"

import authValidationsMessages from "~/messages/en-US/auth.validations.json"
import pagesAdminSettingsMessages from "~/messages/en-US/pages.admin.settings.json"

const messages = getTestMessages("en-US")
const labels = pagesAdminSettingsMessages.security.twoFactor
const FIRST_BACKUP_CODE = "first-backup-code"
const setupData = {
  backupCodes: [FIRST_BACKUP_CODE, "second-backup-code"],
  method: "totp" as const,
  totpURI: "otpauth://totp/Saasyland?secret=TESTSECRET",
}
const verificationData = { token: "session-token", user: createAuthSessionFixture().user }
const enableMock = vi.hoisted(() => vi.fn<NonNullable<typeof enableTwoFactorMutation.mutationFn>>())
const disableMock = vi.hoisted(() => vi.fn<NonNullable<typeof disableTwoFactorMutation.mutationFn>>())
const verifyMock = vi.hoisted(() => vi.fn<NonNullable<typeof verifyTotpMutation.mutationFn>>())

vi.mock(import("~/src/modules/two-factor/use-cases/enable-two-factor"), () => ({
  enableTwoFactorMutation: { mutationFn: enableMock, mutationKey: TWO_FACTOR_MUTATION_KEYS.ENABLE },
}))
vi.mock(import("~/src/modules/two-factor/use-cases/disable-two-factor"), () => ({
  disableTwoFactorMutation: { mutationFn: disableMock, mutationKey: TWO_FACTOR_MUTATION_KEYS.DISABLE },
}))
vi.mock(import("~/src/modules/two-factor/use-cases/verify-totp"), () => ({
  verifyTotpMutation: { mutationFn: verifyMock, mutationKey: TWO_FACTOR_MUTATION_KEYS.VERIFY_TOTP },
}))

const renderCard = (twoFactorEnabled = false) => {
  const session = createAuthSessionFixture()
  session.user.twoFactorEnabled = twoFactorEnabled
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  const result = renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <SettingsTwoFactor />
    </IntlProvider>,
    { queryClient },
  )
  return { ...result, user: userEvent.setup() }
}

const startSetup = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: labels.enable }))
  await user.type(screen.getByLabelText(labels.password), "Secret1!")
  await user.click(screen.getByRole("button", { name: labels.continue }))
  return screen.findByLabelText(labels.verificationCode)
}

beforeAll(() => {
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => null })
})

afterAll(() => {
  Reflect.deleteProperty(document, "elementFromPoint")
})

beforeEach(() => {
  vi.clearAllMocks()
  enableMock.mockResolvedValue(setupData)
  disableMock.mockResolvedValue({ status: true })
  verifyMock.mockResolvedValue(verificationData)
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

const dismissPendingDialog = async (user: ReturnType<typeof userEvent.setup>, launcherLabel: string) => {
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }))
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
  const launcher = screen.getByRole("button", { name: launcherLabel })
  expect(launcher).toBeDisabled()
  fireEvent.click(launcher)
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  return launcher
}

describe("two-factor settings pending requests", () => {
  it.each([false, true])("ignores a completed setup after dismissal (reopened: %s)", async (reopen) => {
    const pending = Promise.withResolvers<typeof setupData>()
    enableMock.mockReturnValueOnce(pending.promise)
    const { user, queryClient } = renderCard()
    await user.click(screen.getByRole("button", { name: labels.enable }))
    await user.type(screen.getByLabelText(labels.password), "Secret1!")
    await user.click(screen.getByRole("button", { name: labels.continue }))
    await waitFor(() => {
      expect(enableMock).toHaveBeenCalledOnce()
    })
    const launcher = await dismissPendingDialog(user, labels.enable)

    await act(async () => {
      pending.resolve(setupData)
      await pending.promise
    })

    expect(queryClient.getQueryState(getCurrentSessionQuery.queryKey)?.isInvalidated).toBe(true)
    await waitFor(() => {
      expect(launcher).toBeEnabled()
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("TESTSECRET")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(labels.verificationCode)).not.toBeInTheDocument()
    expect(enableMock).toHaveBeenCalledOnce()
    if (reopen) {
      await user.click(launcher)
      expect(await screen.findByLabelText(labels.password)).toHaveValue("")
    } else {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    }
  })

  it.each([false, true])("does not restore recovery codes after verification was dismissed (reopened: %s)", async (reopen) => {
    const pending = Promise.withResolvers<typeof verificationData>()
    verifyMock.mockReturnValueOnce(pending.promise)
    const { user, queryClient } = renderCard()
    const input = await startSetup(user)
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture())
    fireEvent.change(input, { target: { value: "123456" } })
    await user.click(screen.getByRole("button", { name: labels.verifyAndEnable }))
    await waitFor(() => {
      expect(verifyMock).toHaveBeenCalledOnce()
    })
    const launcher = await dismissPendingDialog(user, labels.enable)

    await act(async () => {
      pending.resolve(verificationData)
      await pending.promise
    })

    expect(queryClient.getQueryState(getCurrentSessionQuery.queryKey)?.isInvalidated).toBe(true)
    await waitFor(() => {
      expect(launcher).toBeEnabled()
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText(FIRST_BACKUP_CODE)).not.toBeInTheDocument()
    expect(verifyMock).toHaveBeenCalledOnce()
    if (reopen) {
      await user.click(launcher)
      expect(await screen.findByLabelText(labels.password)).toHaveValue("")
    } else {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    }
  })

  it("keeps the disable launcher locked after dismissal until the request settles", async () => {
    const pending = Promise.withResolvers<{ status: boolean }>()
    disableMock.mockReturnValueOnce(pending.promise)
    const { user, queryClient } = renderCard(true)
    await user.click(screen.getByRole("button", { name: labels.disable }))
    await user.type(screen.getByLabelText(labels.password), "Secret1!")
    await user.click(screen.getByRole("button", { name: labels.disableConfirm }))
    await waitFor(() => {
      expect(disableMock).toHaveBeenCalledOnce()
    })
    const launcher = await dismissPendingDialog(user, labels.disable)

    await act(async () => {
      pending.resolve({ status: true })
      await pending.promise
    })

    expect(queryClient.getQueryState(getCurrentSessionQuery.queryKey)?.isInvalidated).toBe(true)
    await waitFor(() => {
      expect(launcher).toBeEnabled()
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(disableMock).toHaveBeenCalledOnce()
    await user.click(launcher)
    expect(await screen.findByLabelText(labels.password)).toHaveValue("")
    expect(screen.getByRole("dialog")).toBeVisible()
  })
})

describe("two-factor settings", () => {
  it.each([false, true])("reports a failed request without closing the password step (disabling: %s)", async (enabled) => {
    const request = enabled ? disableMock : enableMock
    request.mockRejectedValueOnce(new Error("Request failed"))
    const { user, queryClient } = renderCard(enabled)
    await user.click(screen.getByRole("button", { name: enabled ? labels.disable : labels.enable }))
    await user.type(screen.getByLabelText(labels.password), "Secret1!")
    await user.click(screen.getByRole("button", { name: enabled ? labels.disableConfirm : labels.continue }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce()
    })
    expect(screen.getByRole("dialog")).toBeVisible()
    expect(screen.getByLabelText(labels.password)).toHaveValue("Secret1!")
    expect(queryClient.getQueryState(getCurrentSessionQuery.queryKey)?.isInvalidated).toBe(false)
  })
  it.each([false, true])("requires a password before sending the request (disabling: %s)", async (enabled) => {
    const { user } = renderCard(enabled)
    await user.click(screen.getByRole("button", { name: enabled ? labels.disable : labels.enable }))
    const password = screen.getByLabelText(labels.password)
    await user.click(screen.getByRole("button", { name: enabled ? labels.disableConfirm : labels.continue }))

    expect(await screen.findByText(authValidationsMessages.passwordRequired)).toBeVisible()
    expect(password).toHaveAttribute("aria-invalid", "true")
    expect(enableMock).not.toHaveBeenCalled()
    expect(disableMock).not.toHaveBeenCalled()

    await user.type(password, "Secret1!")
    await waitFor(() => {
      expect(screen.queryByText(authValidationsMessages.passwordRequired)).not.toBeInTheDocument()
    })
    expect(password).toHaveAttribute("aria-invalid", "false")
  })

  it("allows setup to be retried when the server returns a different verification method", async () => {
    enableMock.mockResolvedValueOnce({ method: "otp" })
    const { user } = renderCard()
    await user.click(screen.getByRole("button", { name: labels.enable }))
    await user.type(screen.getByLabelText(labels.password), "Secret1!")
    await user.click(screen.getByRole("button", { name: labels.continue }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(labels.setupError)
    })
    expect(screen.getByRole("button", { name: labels.continue })).toBeEnabled()
    expect(screen.queryByLabelText(labels.verificationCode)).not.toBeInTheDocument()
    expect(screen.queryByText(FIRST_BACKUP_CODE)).not.toBeInTheDocument()
  })

  it("keeps verification pending through session refresh and then displays the received recovery codes", async () => {
    const { user, queryClient } = renderCard()
    const input = await startSetup(user)
    const refresh = Promise.withResolvers<void>()
    const refreshSession = vi.spyOn(queryClient, "invalidateQueries").mockReturnValue(refresh.promise)
    const verify = screen.getByRole("button", { name: labels.verifyAndEnable })

    await user.click(verify)
    expect(await screen.findByText(authValidationsMessages.twoFactorCodeRequired)).toBeVisible()
    expect(verifyMock).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: "123456" } })
    await user.click(verify)
    await waitFor(() => {
      expect(refreshSession).toHaveBeenCalled()
    })
    expect(verify).toHaveAttribute("aria-disabled", "true")
    await user.click(verify)
    expect(verifyMock).toHaveBeenCalledExactlyOnceWith({ code: "123456" }, expect.anything())
    expect(screen.queryByText(FIRST_BACKUP_CODE)).not.toBeInTheDocument()

    await act(async () => {
      refresh.resolve()
      await refresh.promise
    })
    for (const code of setupData.backupCodes) {
      expect(await screen.findByText(code)).toBeVisible()
    }
    await user.click(screen.getByRole("button", { name: labels.done }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("allows a failed verification to be retried without losing the setup data", async () => {
    verifyMock.mockRejectedValueOnce(new Error("INVALID_TWO_FACTOR_CODE"))
    const { user } = renderCard()
    const input = await startSetup(user)
    fireEvent.change(input, { target: { value: "123456" } })
    await user.click(screen.getByRole("button", { name: labels.verifyAndEnable }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce()
    })

    expect(screen.getByText("TESTSECRET")).toBeVisible()
    expect(screen.getByLabelText(labels.verificationCode)).toHaveValue("123456")
    await user.click(screen.getByRole("button", { name: labels.verifyAndEnable }))
    expect(await screen.findByText(FIRST_BACKUP_CODE)).toBeVisible()
    expect(verifyMock).toHaveBeenCalledTimes(2)
  })

  it("discards setup data on close and starts again from the password step", async () => {
    const { user } = renderCard()
    await startSetup(user)
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: labels.enable }))

    expect(screen.getByLabelText(labels.password)).toHaveValue("")
    expect(screen.queryByText("TESTSECRET")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(labels.verificationCode)).not.toBeInTheDocument()
  })

  it("opens the disable flow for an enabled account and closes after password confirmation", async () => {
    const { user, queryClient } = renderCard(true)
    await user.click(screen.getByRole("button", { name: labels.disable }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: labels.disableDialogTitle })).toBeVisible()
    await user.type(within(dialog).getByLabelText(labels.password), "Secret1!")
    await user.click(within(dialog).getByRole("button", { name: labels.disableConfirm }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(disableMock).toHaveBeenCalledExactlyOnceWith({ password: "Secret1!" }, expect.anything())
    expect(toast.success).toHaveBeenCalledWith(labels.disabledSuccess)
    expect(queryClient.getQueryState(getCurrentSessionQuery.queryKey)?.isInvalidated).toBe(true)
  })
})
