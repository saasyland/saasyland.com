import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { TWO_FACTOR_MUTATION_KEYS } from "~/src/modules/two-factor/two-factor.constants"

import { TwoFactorForm } from "~/src/presentation/components/custom/auth/two-factor-form"

import errorsMessages from "~/messages/en-US/errors.json"
import pagesAuthTwoFactorMessages from "~/messages/en-US/pages.auth.two-factor.json"
import { ROUTES } from "~/src/routes"

const verifyTotp = vi.hoisted(() => vi.fn())
const verifyBackupCode = vi.hoisted(() => vi.fn())

vi.mock(import("~/src/modules/two-factor/use-cases/verify-totp"), () => ({
  verifyTotpMutation: { mutationFn: verifyTotp, mutationKey: TWO_FACTOR_MUTATION_KEYS.VERIFY_TOTP },
}))
vi.mock(import("~/src/modules/two-factor/use-cases/verify-backup-code"), () => ({
  verifyBackupCodeMutation: { mutationFn: verifyBackupCode, mutationKey: TWO_FACTOR_MUTATION_KEYS.VERIFY_BACKUP_CODE },
}))

const messages = getTestMessages("en-US")
const labels = pagesAuthTwoFactorMessages.form
const code = "123456"
const backupCode = "recover123"

const setup = () => {
  const router = createTestRouter(ROUTES.TWO_FACTOR)
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue()
  const clearCache = vi.spyOn(router, "clearCache")
  const result = renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <TwoFactorForm />
    </IntlProvider>,
    { router },
  )
  result.queryClient.setQueryData(["private-session"], { userId: "user-1" })
  return { ...result, clearCache, navigate, user: userEvent.setup() }
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => null })
  vi.spyOn(toast, "error").mockReturnValue(0)
  vi.spyOn(toast, "success").mockReturnValue(0)
})

afterEach(() => {
  Reflect.deleteProperty(document, "elementFromPoint")
})

describe("two-factor verification", () => {
  it("switches between authenticator and recovery codes without submitting either form", async () => {
    const { user } = setup()
    expect(screen.getByLabelText(labels.code)).toHaveAttribute("autocomplete", "one-time-code")
    await user.click(screen.getByRole("button", { name: labels.useBackupCode }))
    expect(screen.getByLabelText(labels.backupCode)).toBeVisible()
    await user.click(screen.getByRole("button", { name: labels.useAuthenticator }))
    expect(screen.getByLabelText(labels.code)).toBeVisible()
    expect(verifyTotp).not.toHaveBeenCalled()
    expect(verifyBackupCode).not.toHaveBeenCalled()
  })

  it.each(["totp", "backup"] as const)("validates %s input before calling the verification API", async (mode) => {
    const { user } = setup()
    if (mode === "backup") {
      await user.click(screen.getByRole("button", { name: labels.useBackupCode }))
    }
    await user.click(screen.getByRole("button", { name: labels.submit }))
    expect(await screen.findByRole("alert")).toBeVisible()
    expect(screen.getByLabelText(mode === "backup" ? labels.backupCode : labels.code)).toHaveAttribute("aria-invalid", "true")
    expect(verifyTotp).not.toHaveBeenCalled()
    expect(verifyBackupCode).not.toHaveBeenCalled()
  })

  it.each(["totp", "backup"] as const)(
    "keeps %s pending, then clears private caches before redirecting after verification",
    async (mode) => {
      const request = Promise.withResolvers<void>()
      const mutation = mode === "backup" ? verifyBackupCode : verifyTotp
      mutation.mockReturnValueOnce(request.promise)
      const { user, queryClient, navigate, clearCache } = setup()
      if (mode === "backup") {
        await user.click(screen.getByRole("button", { name: labels.useBackupCode }))
      }
      await user.type(screen.getByLabelText(mode === "backup" ? labels.backupCode : labels.code), mode === "backup" ? backupCode : code)
      await user.tab()
      await user.click(screen.getByRole("button", { name: labels.submit }))
      expect(screen.getByRole("button", { name: labels.submitting })).toHaveAttribute("aria-disabled", "true")
      expect(mutation).toHaveBeenCalledExactlyOnceWith(
        { code: mode === "backup" ? backupCode : code, trustDevice: true },
        expect.anything(),
      )
      expect(navigate).not.toHaveBeenCalled()
      await act(async () => {
        request.resolve()
        await request.promise
      })
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith({ replace: true, to: ROUTES.AUTH_CALLBACK })
      })
      expect(queryClient.getQueryData(["private-session"])).toBeUndefined()
      expect(clearCache).toHaveBeenCalledOnce()
      expect(toast.success).toHaveBeenCalledWith(labels.success)
    },
  )

  it.each(["totp", "backup"] as const)("keeps %s verification available after a rejected code", async (mode) => {
    const mutation = mode === "backup" ? verifyBackupCode : verifyTotp
    mutation.mockRejectedValueOnce(new Error("Invalid verification code"))
    const { user, navigate } = setup()
    if (mode === "backup") {
      await user.click(screen.getByRole("button", { name: labels.useBackupCode }))
    }
    await user.type(screen.getByLabelText(mode === "backup" ? labels.backupCode : labels.code), mode === "backup" ? backupCode : code)
    await user.click(screen.getByRole("button", { name: labels.submit }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(screen.getByRole("button", { name: labels.submit })).toBeEnabled()
    expect(navigate).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
