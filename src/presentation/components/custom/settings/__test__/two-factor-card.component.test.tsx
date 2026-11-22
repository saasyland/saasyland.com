import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { encode } from "uqr"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { TWO_FACTOR_MUTATION_KEYS } from "~/src/modules/two-factor/two-factor.constants"
import type * as DisableTwoFactorUseCase from "~/src/modules/two-factor/use-cases/disable-two-factor"
import type * as EnableTwoFactorUseCase from "~/src/modules/two-factor/use-cases/enable-two-factor"
import type * as GenerateBackupCodesUseCase from "~/src/modules/two-factor/use-cases/generate-backup-codes"
import type * as VerifyTotpUseCase from "~/src/modules/two-factor/use-cases/verify-totp"

import { GITHUB_ACCOUNT, renderSettings, settingsSession } from "~/src/presentation/components/custom/settings/__test__/fixtures"
import { TwoFactorCard } from "~/src/presentation/components/custom/settings/two-factor-card"
import { TwoFactorQrCode } from "~/src/presentation/components/custom/settings/two-factor-qr-code"

import authSecurityMessages from "~/messages/en-US/auth.security.json"
import authValidationsMessages from "~/messages/en-US/auth.validations.json"
import dialogMessages from "~/messages/en-US/components.shadcn.dialog.json"
import errorsMessages from "~/messages/en-US/errors.json"
import { APP_NAME } from "~/src/presentation/branding"

type User = ReturnType<typeof userEvent.setup>
type Enabled = Awaited<ReturnType<NonNullable<typeof EnableTwoFactorUseCase.enableTwoFactorMutation.mutationFn>>>
type Disabled = Awaited<ReturnType<NonNullable<typeof DisableTwoFactorUseCase.disableTwoFactorMutation.mutationFn>>>
type Regenerated = Awaited<ReturnType<NonNullable<typeof GenerateBackupCodesUseCase.generateBackupCodesMutation.mutationFn>>>
type Verified = Awaited<ReturnType<NonNullable<typeof VerifyTotpUseCase.verifyTotpMutation.mutationFn>>>

const enableMock = vi.hoisted(() => vi.fn<NonNullable<typeof EnableTwoFactorUseCase.enableTwoFactorMutation.mutationFn>>())
const disableMock = vi.hoisted(() => vi.fn<NonNullable<typeof DisableTwoFactorUseCase.disableTwoFactorMutation.mutationFn>>())
const regenerateMock = vi.hoisted(() => vi.fn<NonNullable<typeof GenerateBackupCodesUseCase.generateBackupCodesMutation.mutationFn>>())
const verifyMock = vi.hoisted(() => vi.fn<NonNullable<typeof VerifyTotpUseCase.verifyTotpMutation.mutationFn>>())

vi.mock(import("~/src/modules/two-factor/use-cases/enable-two-factor"), () => ({
  enableTwoFactorMutation: { mutationFn: enableMock, mutationKey: TWO_FACTOR_MUTATION_KEYS.ENABLE },
}))
vi.mock(import("~/src/modules/two-factor/use-cases/disable-two-factor"), () => ({
  disableTwoFactorMutation: { mutationFn: disableMock, mutationKey: TWO_FACTOR_MUTATION_KEYS.DISABLE },
}))
vi.mock(import("~/src/modules/two-factor/use-cases/generate-backup-codes"), () => ({
  generateBackupCodesMutation: { mutationFn: regenerateMock, mutationKey: TWO_FACTOR_MUTATION_KEYS.GENERATE_BACKUP_CODES },
}))
vi.mock(import("~/src/modules/two-factor/use-cases/verify-totp"), () => ({
  verifyTotpMutation: { mutationFn: verifyMock, mutationKey: TWO_FACTOR_MUTATION_KEYS.VERIFY_TOTP },
}))

const labels = authSecurityMessages.twoFactor
const PASSWORD = "SecretPass1!"
const CODE = "123456"
const SETUP_KEY = "TESTSECRET"
const TOTP_METHOD = "totp"
const OTP_METHOD = "otp"
const TOTP_URI = `otpauth://totp/${encodeURIComponent(APP_NAME)}?secret=${SETUP_KEY}`
const FIRST_BACKUP_CODE = "first-backup-code"
const NEW_BACKUP_CODE = "new-backup-code"
const ENABLED: Enabled = { backupCodes: [FIRST_BACKUP_CODE, "second-backup-code"], method: TOTP_METHOD, totpURI: TOTP_URI }
const DISABLED: Disabled = { status: true }
const REGENERATED: Regenerated = { backupCodes: [NEW_BACKUP_CODE], status: true }
const VERIFIED: Verified = { token: "session-token", user: createAuthSessionFixture().user }

const renderCard = (twoFactorEnabled = false) => renderSettings(<TwoFactorCard />, { session: settingsSession({ twoFactorEnabled }) })

const dialog = (): HTMLElement => screen.getByRole("dialog")

const confirmPassword = async (user: User, launcher: string, confirm: string): Promise<void> => {
  await user.click(screen.getByRole("button", { name: launcher }))
  await user.click(within(dialog()).getByLabelText(labels.password))
  await user.paste(PASSWORD)
  await user.click(within(dialog()).getByRole("button", { name: confirm }))
}

const startSetup = async (user: User): Promise<HTMLElement> => {
  await confirmPassword(user, labels.enable, labels.confirm.enable)
  return screen.findByLabelText(labels.code)
}

const dismiss = async (user: User): Promise<void> => {
  await user.click(within(dialog()).getByRole("button", { name: dialogMessages.close }))
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
}

const expectLockedUntil = async (user: User, launchers: readonly string[], settle: () => Promise<void>): Promise<void> => {
  await dismiss(user)
  for (const launcher of launchers) {
    const button = screen.getByRole("button", { name: launcher })
    expect(button).toBeDisabled()
    fireEvent.click(button)
  }
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  await act(settle)
  for (const launcher of launchers) {
    await waitFor(() => {
      expect(screen.getByRole("button", { name: launcher })).toBeEnabled()
    })
  }
}

const expectBothLaunchersLocked = async (launcher: string, confirm: string, settle: () => Promise<void>): Promise<void> => {
  const { user } = renderCard(true)
  await confirmPassword(user, launcher, confirm)
  await expectLockedUntil(user, [labels.regenerate, labels.disable], settle)

  await user.click(screen.getByRole("button", { name: launcher }))
  expect(within(dialog()).getByLabelText(labels.password)).toHaveValue("")
}

beforeAll(() => {
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => null })
})

afterAll(() => {
  Reflect.deleteProperty(document, "elementFromPoint")
})

beforeEach(() => {
  enableMock.mockReset().mockResolvedValue(ENABLED)
  disableMock.mockReset().mockResolvedValue(DISABLED)
  regenerateMock.mockReset().mockResolvedValue(REGENERATED)
  verifyMock.mockReset().mockResolvedValue(VERIFIED)
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("two-factor card", () => {
  it("shows two-factor as off with a way to turn it on", () => {
    renderCard()

    expect(screen.getByRole("heading", { name: labels.title })).toBeVisible()
    expect(screen.getByText(labels.off)).toBeVisible()
    expect(screen.getByRole("button", { name: labels.enable })).toBeEnabled()
    expect(screen.queryByRole("button", { name: labels.disable })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: labels.regenerate })).not.toBeInTheDocument()
  })

  it("shows two-factor as on with new backup codes and a way to turn it off", () => {
    renderCard(true)

    expect(screen.getByText(labels.on)).toBeVisible()
    expect(screen.getByRole("button", { name: labels.regenerate })).toBeEnabled()
    expect(screen.getByRole("button", { name: labels.disable })).toBeEnabled()
    expect(screen.queryByRole("button", { name: labels.enable })).not.toBeInTheDocument()
  })

  it("shows two-factor as off when the session is gone", () => {
    renderSettings(<TwoFactorCard />, { session: null })

    expect(screen.getByText(labels.off)).toBeVisible()
  })

  it("asks an account without a password to set one first", () => {
    renderSettings(<TwoFactorCard />, { accounts: [GITHUB_ACCOUNT] })

    expect(screen.getByText(labels.needsPassword)).toBeVisible()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it.each([
    { confirm: labels.confirm.enable, enabled: false, launcher: labels.enable },
    { confirm: labels.confirm.disable, enabled: true, launcher: labels.disable },
    { confirm: labels.confirm.regenerate, enabled: true, launcher: labels.regenerate },
  ])("requires the password before $launcher sends a request", async ({ confirm, enabled, launcher }) => {
    const { user } = renderCard(enabled)
    await user.click(screen.getByRole("button", { name: launcher }))
    const password = within(dialog()).getByLabelText(labels.password)
    await user.click(within(dialog()).getByRole("button", { name: confirm }))

    expect(await screen.findByText(authValidationsMessages.passwordRequired)).toBeVisible()
    expect(password).toHaveAttribute("aria-invalid", "true")
    expect(enableMock).not.toHaveBeenCalled()
    expect(disableMock).not.toHaveBeenCalled()
    expect(regenerateMock).not.toHaveBeenCalled()

    await user.click(password)
    await user.paste(PASSWORD)
    await waitFor(() => {
      expect(screen.queryByText(authValidationsMessages.passwordRequired)).not.toBeInTheDocument()
    })
  })

  it.each([
    { confirm: labels.confirm.enable, enabled: false, launcher: labels.enable, request: enableMock },
    { confirm: labels.confirm.disable, enabled: true, launcher: labels.disable, request: disableMock },
    { confirm: labels.confirm.regenerate, enabled: true, launcher: labels.regenerate, request: regenerateMock },
  ])("reports a failed $launcher request and keeps the password step open", async ({ confirm, enabled, launcher, request }) => {
    request.mockRejectedValueOnce(new Error("Request failed"))
    const { invalidate, user } = renderCard(enabled)
    await confirmPassword(user, launcher, confirm)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(dialog()).toBeVisible()
    expect(within(dialog()).getByLabelText(labels.password)).toHaveValue(PASSWORD)
    expect(invalidate).not.toHaveBeenCalled()
  })
})

describe("turning two-factor on", () => {
  it("confirms the password, then shows the QR code and the setup key", async () => {
    const { user } = renderCard()
    await user.click(screen.getByRole("button", { name: labels.enable }))

    expect(within(dialog()).getByRole("heading", { name: labels.titles.enable })).toBeVisible()
    expect(within(dialog()).getByText(labels.descriptions.enable.replace("{appName}", APP_NAME))).toBeVisible()
    await user.click(within(dialog()).getByLabelText(labels.password))
    await user.paste(PASSWORD)
    await user.click(within(dialog()).getByRole("button", { name: labels.confirm.enable }))

    expect(await screen.findByLabelText(labels.code)).toBeVisible()
    expect(enableMock).toHaveBeenCalledExactlyOnceWith({ password: PASSWORD }, expect.anything())
    expect(within(dialog()).getByText(labels.descriptions.verify.replace("{appName}", APP_NAME))).toBeVisible()
    expect(within(dialog()).getByRole("img", { name: labels.qrCode })).toBeVisible()
    expect(within(dialog()).getByLabelText(labels.manualKey)).toHaveTextContent(SETUP_KEY)
  })

  it("copies the setup key", async () => {
    const { user } = renderCard()
    await startSetup(user)
    await user.click(within(dialog()).getByRole("button", { name: labels.copyKey }))

    expect(await navigator.clipboard.readText()).toBe(SETUP_KEY)
    expect(await within(dialog()).findByRole("button", { name: labels.keyCopied })).toBeVisible()
  })

  it("lets the setup be retried when the server starts a different method", async () => {
    enableMock.mockResolvedValueOnce({ method: OTP_METHOD })
    const { user } = renderCard()
    await confirmPassword(user, labels.enable, labels.confirm.enable)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(labels.setupError)
    })
    expect(within(dialog()).getByRole("button", { name: labels.confirm.enable })).toBeEnabled()
    expect(screen.queryByLabelText(labels.code)).not.toBeInTheDocument()
  })

  it("requires the code, then stays pending through the session refresh before showing the backup codes", async () => {
    const { invalidate, user } = renderCard()
    const input = await startSetup(user)
    const refresh = Promise.withResolvers<undefined>()
    invalidate.mockReturnValue(refresh.promise)
    const verify = within(dialog()).getByRole("button", { name: labels.verify })

    await user.click(verify)
    expect(await screen.findByText(authValidationsMessages.twoFactorCodeRequired)).toBeVisible()
    expect(verifyMock).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: CODE } })
    await user.click(verify)
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: SESSION_QUERY_KEYS.ALL })
    })
    expect(verify).toHaveAttribute("aria-disabled", "true")
    expect(verifyMock).toHaveBeenCalledExactlyOnceWith({ code: CODE }, expect.anything())
    expect(screen.queryByText(FIRST_BACKUP_CODE)).not.toBeInTheDocument()

    await act(async () => {
      refresh.resolve(undefined)
      await refresh.promise
    })
    expect(await within(dialog()).findByRole("heading", { name: labels.backupCodesTitle })).toBeVisible()
    expect(toast.success).toHaveBeenCalledWith(labels.enabled)
    for (const code of ENABLED.backupCodes) {
      expect(screen.getByText(code)).toBeVisible()
    }
  })

  it("closes once the backup codes are saved", async () => {
    const { user } = renderCard()
    fireEvent.change(await startSetup(user), { target: { value: CODE } })
    await user.click(within(dialog()).getByRole("button", { name: labels.verify }))
    await user.click(await within(dialog()).findByRole("button", { name: labels.saved }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("keeps the setup to retry a rejected code", async () => {
    verifyMock.mockRejectedValueOnce(new Error("INVALID_TWO_FACTOR_CODE"))
    const { user } = renderCard()
    fireEvent.change(await startSetup(user), { target: { value: CODE } })
    await user.click(within(dialog()).getByRole("button", { name: labels.verify }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce()
    })

    expect(within(dialog()).getByLabelText(labels.manualKey)).toHaveTextContent(SETUP_KEY)
    expect(screen.getByLabelText(labels.code)).toHaveValue(CODE)
    await user.click(within(dialog()).getByRole("button", { name: labels.verify }))
    expect(await screen.findByText(FIRST_BACKUP_CODE)).toBeVisible()
    expect(verifyMock).toHaveBeenCalledTimes(2)
  })

  it("discards the setup on close and starts again from the password", async () => {
    const { user } = renderCard()
    await startSetup(user)
    await dismiss(user)
    await user.click(screen.getByRole("button", { name: labels.enable }))

    expect(within(dialog()).getByLabelText(labels.password)).toHaveValue("")
    expect(screen.queryByLabelText(labels.manualKey)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(labels.code)).not.toBeInTheDocument()
  })
})

describe("turning two-factor off and replacing backup codes", () => {
  it("turns two-factor off after the password and refreshes the session", async () => {
    const { invalidate, user } = renderCard(true)
    await user.click(screen.getByRole("button", { name: labels.disable }))

    expect(within(dialog()).getByRole("heading", { name: labels.titles.disable })).toBeVisible()
    expect(within(dialog()).getByText(labels.descriptions.disable)).toBeVisible()
    await user.click(within(dialog()).getByLabelText(labels.password))
    await user.paste(PASSWORD)
    await user.click(within(dialog()).getByRole("button", { name: labels.confirm.disable }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(disableMock).toHaveBeenCalledExactlyOnceWith({ password: PASSWORD }, expect.anything())
    expect(toast.success).toHaveBeenCalledWith(labels.disabled)
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: SESSION_QUERY_KEYS.ALL })
  })

  it("creates new backup codes after the password and shows them until they are saved", async () => {
    const { user } = renderCard(true)
    await user.click(screen.getByRole("button", { name: labels.regenerate }))

    expect(within(dialog()).getByRole("heading", { name: labels.titles.regenerate })).toBeVisible()
    expect(within(dialog()).getByText(labels.descriptions.regenerate)).toBeVisible()
    await user.click(within(dialog()).getByLabelText(labels.password))
    await user.paste(PASSWORD)
    await user.click(within(dialog()).getByRole("button", { name: labels.confirm.regenerate }))

    expect(await within(dialog()).findByText(NEW_BACKUP_CODE)).toBeVisible()
    expect(regenerateMock).toHaveBeenCalledExactlyOnceWith({ password: PASSWORD }, expect.anything())
    expect(toast.success).toHaveBeenCalledWith(labels.regenerated)
    expect(within(dialog()).getByRole("heading", { name: labels.backupCodesTitle })).toBeVisible()
    await user.click(within(dialog()).getByRole("button", { name: labels.saved }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})

describe("two-factor requests that outlive their dialog", () => {
  it.each([false, true])("drops a setup that finishes after the dialog closed (reopened: %s)", async (reopen) => {
    const pending = Promise.withResolvers<Enabled>()
    enableMock.mockReturnValueOnce(pending.promise)
    const { user } = renderCard()
    await confirmPassword(user, labels.enable, labels.confirm.enable)
    await expectLockedUntil(user, [labels.enable], async () => {
      pending.resolve(ENABLED)
      await pending.promise
    })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(labels.code)).not.toBeInTheDocument()
    expect(enableMock).toHaveBeenCalledOnce()
    if (reopen) {
      await user.click(screen.getByRole("button", { name: labels.enable }))
      expect(within(dialog()).getByLabelText(labels.password)).toHaveValue("")
    }
  })

  it("refreshes the session but shows no backup codes when the verification finishes after the dialog closed", async () => {
    const pending = Promise.withResolvers<Verified>()
    verifyMock.mockReturnValueOnce(pending.promise)
    const { invalidate, user } = renderCard()
    fireEvent.change(await startSetup(user), { target: { value: CODE } })
    await user.click(within(dialog()).getByRole("button", { name: labels.verify }))
    await expectLockedUntil(user, [labels.enable], async () => {
      pending.resolve(VERIFIED)
      await pending.promise
    })

    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: SESSION_QUERY_KEYS.ALL })
    expect(screen.queryByText(FIRST_BACKUP_CODE)).not.toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("locks both launchers while turning off runs after its dialog closed", async () => {
    const pending = Promise.withResolvers<Disabled>()
    disableMock.mockReturnValueOnce(pending.promise)

    await expectBothLaunchersLocked(labels.disable, labels.confirm.disable, async () => {
      pending.resolve(DISABLED)
      await pending.promise
    })
  })

  it("locks both launchers while new backup codes are created after the dialog closed, and never shows them", async () => {
    const pending = Promise.withResolvers<Regenerated>()
    regenerateMock.mockReturnValueOnce(pending.promise)

    await expectBothLaunchersLocked(labels.regenerate, labels.confirm.regenerate, async () => {
      pending.resolve(REGENERATED)
      await pending.promise
    })
    expect(screen.queryByText(NEW_BACKUP_CODE)).not.toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe("the authenticator QR code", () => {
  it("draws the setup URI as a square image named for the authenticator app", () => {
    render(<TwoFactorQrCode label={labels.qrCode} value={TOTP_URI} />)
    const size = String(encode(TOTP_URI, { border: 0 }).size)
    const image = screen.getByRole("img", { name: labels.qrCode })

    expect(image).toHaveAttribute("viewBox", `0 0 ${size} ${size}`)
    expect(image.querySelector("path")?.getAttribute("d")).toMatch(/^(?:M\d+ \d+h1v1h-1z)+$/u)
  })
})
