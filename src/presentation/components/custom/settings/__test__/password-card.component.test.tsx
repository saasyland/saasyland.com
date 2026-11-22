import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"

import { ACCOUNT_MUTATION_KEYS, ACCOUNT_QUERY_KEYS } from "~/src/modules/account/account.constants"
import type * as ChangePasswordUseCase from "~/src/modules/account/use-cases/change-password"
import type * as SetPasswordUseCase from "~/src/modules/account/use-cases/set-password"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import {
  CREDENTIAL_ACCOUNT,
  GITHUB_ACCOUNT,
  GOOGLE_ACCOUNT,
  renderSettings,
} from "~/src/presentation/components/custom/settings/__test__/fixtures"
import { PasswordCard } from "~/src/presentation/components/custom/settings/password-card"

import authSecurityMessages from "~/messages/en-US/auth.security.json"
import authValidationsMessages from "~/messages/en-US/auth.validations.json"
import errorsMessages from "~/messages/en-US/errors.json"

type PasswordChanged = Awaited<ReturnType<NonNullable<typeof ChangePasswordUseCase.changePasswordMutation.mutationFn>>>

const changePasswordMock = vi.hoisted(() => vi.fn<NonNullable<typeof ChangePasswordUseCase.changePasswordMutation.mutationFn>>())
const setPasswordMock = vi.hoisted(() => vi.fn<NonNullable<typeof SetPasswordUseCase.setPasswordMutation.mutationFn>>())

vi.mock(import("~/src/modules/account/use-cases/change-password"), () => ({
  changePasswordMutation: { mutationFn: changePasswordMock, mutationKey: ACCOUNT_MUTATION_KEYS.CHANGE_PASSWORD },
}))
vi.mock(import("~/src/modules/account/use-cases/set-password"), () => ({
  setPasswordMutation: { mutationFn: setPasswordMock, mutationKey: ACCOUNT_MUTATION_KEYS.SET_PASSWORD },
}))

const labels = authSecurityMessages.password
const CURRENT_PASSWORD = "OldPassword1!"
const NEW_PASSWORD = "NewPassword1!"
const PASSWORD_SAVED = { status: true } satisfies Awaited<ReturnType<typeof setPasswordMock>>
const PASSWORD_CHANGED: PasswordChanged = { token: null, user: createAuthSessionFixture().user }

const fill = (label: string, value: string): void => {
  const field = screen.getByLabelText(label)
  fireEvent.change(field, { target: { value } })
  fireEvent.blur(field)
}

const fillPasswords = (newPassword = NEW_PASSWORD): void => {
  fill(labels.current, CURRENT_PASSWORD)
  fill(labels.new, newPassword)
}

const expectPasswordsRefreshed = (invalidate: ReturnType<typeof renderSettings>["invalidate"]): void => {
  expect(invalidate).toHaveBeenCalledTimes(2)
  expect(invalidate).toHaveBeenCalledWith({ queryKey: SESSION_QUERY_KEYS.ALL })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ACCOUNT_QUERY_KEYS.ALL })
}

beforeEach(() => {
  changePasswordMock.mockReset()
  setPasswordMock.mockReset().mockResolvedValue(PASSWORD_SAVED)
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("changing the password of an account that has one", () => {
  it("waits for the change, signs out the other devices, refreshes sessions and accounts and clears the fields", async () => {
    const pending = Promise.withResolvers<PasswordChanged>()
    changePasswordMock.mockReturnValueOnce(pending.promise)
    const { invalidate } = renderSettings(<PasswordCard />)

    expect(screen.getByRole("heading", { name: labels.title })).toBeVisible()
    expect(screen.getByText(labels.description)).toBeVisible()
    fillPasswords()
    const button = screen.getByRole("button", { name: labels.update })
    fireEvent.click(button)
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-disabled", "true")
    })
    expect(changePasswordMock).toHaveBeenCalledWith({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD }, expect.anything())

    await act(async () => {
      pending.resolve(PASSWORD_CHANGED)
      await pending.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.updated)
    })
    expectPasswordsRefreshed(invalidate)
    expect(screen.getByLabelText(labels.current)).toHaveValue("")
    expect(screen.getByLabelText(labels.new)).toHaveValue("")
  })

  it("keeps the passwords to retry when the request fails", async () => {
    changePasswordMock.mockRejectedValueOnce(new Error("Network unavailable"))
    const { invalidate } = renderSettings(<PasswordCard />)
    fillPasswords()
    fireEvent.click(screen.getByRole("button", { name: labels.update }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(screen.getByLabelText(labels.new)).toHaveValue(NEW_PASSWORD)
    expect(screen.getByRole("button", { name: labels.update })).toBeEnabled()
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("rejects a new password that is too short before calling the server", async () => {
    renderSettings(<PasswordCard />)
    fillPasswords("short")
    fireEvent.click(screen.getByRole("button", { name: labels.update }))

    const newPassword = screen.getByLabelText(labels.new)
    await waitFor(() => {
      expect(newPassword).toHaveAttribute("aria-invalid", "true")
    })
    expect(newPassword).toHaveFocus()
    const tooShort = authValidationsMessages.passwordMinLength.replace("{min}", String(PASSWORD_MIN_LENGTH))
    expect(screen.getByText(tooShort)).toHaveAttribute("id", "newPassword-error")
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it("shows a password found in a known data breach on the new password field and focuses it", async () => {
    changePasswordMock.mockRejectedValueOnce(new Error(AUTH_ERRORS.PASSWORD_COMPROMISED))
    renderSettings(<PasswordCard />)
    fillPasswords()
    fireEvent.click(screen.getByRole("button", { name: labels.update }))

    const newPassword = screen.getByLabelText(labels.new)
    await waitFor(() => {
      expect(screen.getByText(authValidationsMessages.passwordCompromised)).toHaveAttribute("id", "newPassword-error")
    })
    expect(newPassword).toHaveAttribute("aria-invalid", "true")
    expect(newPassword).toHaveFocus()
    expect(toast.error).not.toHaveBeenCalled()

    fireEvent.change(newPassword, { target: { value: `${NEW_PASSWORD}?` } })

    expect(screen.queryByText(authValidationsMessages.passwordCompromised)).not.toBeInTheDocument()
    expect(newPassword).toHaveAttribute("aria-invalid", "false")
  })
})

describe("setting a password on an account that signs in with a provider", () => {
  it.each([
    { accounts: [GITHUB_ACCOUNT], providers: "GitHub" },
    { accounts: [GITHUB_ACCOUNT, GOOGLE_ACCOUNT], providers: "GitHub and Google" },
  ])("names $providers and asks only for the new password", ({ accounts, providers }) => {
    renderSettings(<PasswordCard />, { accounts })

    expect(screen.getByRole("heading", { name: labels.setTitle })).toBeVisible()
    expect(screen.getByText(labels.setDescription.replace("{providers}", providers))).toBeVisible()
    expect(screen.queryByLabelText(labels.current)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: labels.update })).not.toBeInTheDocument()
  })

  it("sets the password, refreshes sessions and accounts and clears the field", async () => {
    const pending = Promise.withResolvers<typeof PASSWORD_SAVED>()
    setPasswordMock.mockReturnValueOnce(pending.promise)
    const { invalidate } = renderSettings(<PasswordCard />, { accounts: [GITHUB_ACCOUNT] })
    fill(labels.new, NEW_PASSWORD)
    const button = screen.getByRole("button", { name: labels.set })
    fireEvent.click(button)
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-disabled", "true")
    })
    expect(setPasswordMock).toHaveBeenCalledExactlyOnceWith({ newPassword: NEW_PASSWORD }, expect.anything())

    await act(async () => {
      pending.resolve(PASSWORD_SAVED)
      await pending.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.added)
    })
    expectPasswordsRefreshed(invalidate)
    expect(screen.getByLabelText(labels.new)).toHaveValue("")
  })

  it("keeps the password to retry when setting it fails", async () => {
    setPasswordMock.mockRejectedValueOnce(new Error("Network unavailable"))
    const { invalidate } = renderSettings(<PasswordCard />, { accounts: [GITHUB_ACCOUNT] })
    fill(labels.new, NEW_PASSWORD)
    fireEvent.click(screen.getByRole("button", { name: labels.set }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(screen.getByLabelText(labels.new)).toHaveValue(NEW_PASSWORD)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("shows a breached password on the field instead of a toast", async () => {
    setPasswordMock.mockRejectedValueOnce(new Error(AUTH_ERRORS.PASSWORD_COMPROMISED))
    renderSettings(<PasswordCard />, { accounts: [GITHUB_ACCOUNT] })
    fill(labels.new, NEW_PASSWORD)
    fireEvent.click(screen.getByRole("button", { name: labels.set }))

    await waitFor(() => {
      expect(screen.getByText(authValidationsMessages.passwordCompromised)).toHaveAttribute("id", "newPassword-error")
    })
    expect(screen.getByLabelText(labels.new)).toHaveFocus()
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe("password card", () => {
  it("treats an account with a password and a provider as one that has a password", () => {
    renderSettings(<PasswordCard />, { accounts: [GITHUB_ACCOUNT, CREDENTIAL_ACCOUNT] })

    expect(screen.getByRole("heading", { name: labels.title })).toBeVisible()
    expect(screen.getByLabelText(labels.current)).toBeVisible()
  })
})
