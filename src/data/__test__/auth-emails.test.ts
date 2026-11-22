import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import type { AuthEmails } from "~/src/data/auth-emails"

const USER = { email: "ada@example.test", name: "Ada" }
const CHANGE_EMAIL = { newEmail: "grace@example.test", token: "change-token", url: "https://example.test/change", user: USER }
const DELETE_ACCOUNT = { token: "delete-token", url: "https://example.test/delete", user: USER }
const EXISTING_ACCOUNT = { callbackURL: "/auth/callback", user: { ...USER, id: "ada" } }
const PASSWORD_CHANGED = { callbackURL: "/auth/callback", user: USER }
const RESET_PASSWORD = { token: "reset-token", url: "https://example.test/reset", user: USER }
const VERIFICATION = { callbackURL: "/auth/callback", token: "verify-token", user: USER }

const emailArea = (): AuthEmails => ({
  sendChangeEmailConfirmation: vi.fn(() => Promise.resolve()),
  sendDeleteAccount: vi.fn(() => Promise.resolve()),
  sendExistingAccount: vi.fn(() => Promise.resolve()),
  sendPasswordChanged: vi.fn(() => Promise.resolve()),
  sendResetPassword: vi.fn(() => Promise.resolve()),
  sendVerification: vi.fn(() => Promise.resolve()),
})

const loadAuthEmails = async (areas: Readonly<Record<string, AuthEmails>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/auth-emails.entries", () => areas)
  const { AUTH_EMAILS } = await import("~/src/data/auth-emails")
  return AUTH_EMAILS
}

afterEach(() => {
  vi.doUnmock("~/src/data/auth-emails.entries")
})

describe("auth emails", () => {
  it("hands every email to the sender of every area that sends them", async () => {
    const first = emailArea()
    const second = emailArea()
    const emails = await loadAuthEmails({ FIRST_AUTH_EMAILS: first, SECOND_AUTH_EMAILS: second })

    await emails.sendChangeEmailConfirmation(CHANGE_EMAIL)
    await emails.sendDeleteAccount(DELETE_ACCOUNT)
    await emails.sendExistingAccount(EXISTING_ACCOUNT)
    await emails.sendPasswordChanged(PASSWORD_CHANGED)
    await emails.sendResetPassword(RESET_PASSWORD)
    await emails.sendVerification(VERIFICATION)

    for (const area of [first, second]) {
      expect(area.sendChangeEmailConfirmation).toHaveBeenCalledExactlyOnceWith(CHANGE_EMAIL)
      expect(area.sendDeleteAccount).toHaveBeenCalledExactlyOnceWith(DELETE_ACCOUNT)
      expect(area.sendExistingAccount).toHaveBeenCalledExactlyOnceWith(EXISTING_ACCOUNT)
      expect(area.sendPasswordChanged).toHaveBeenCalledExactlyOnceWith(PASSWORD_CHANGED)
      expect(area.sendResetPassword).toHaveBeenCalledExactlyOnceWith(RESET_PASSWORD)
      expect(area.sendVerification).toHaveBeenCalledExactlyOnceWith(VERIFICATION)
    }
  })

  it("fails when a sender fails, so Better Auth reports the email as not sent", async () => {
    const area = emailArea()
    vi.mocked(area.sendResetPassword).mockRejectedValueOnce(new Error("Resend refused"))
    const emails = await loadAuthEmails({ FAILING_AUTH_EMAILS: area })

    await expect(emails.sendResetPassword(RESET_PASSWORD)).rejects.toThrow("Resend refused")
  })

  it("sends nothing when no area sends emails", async () => {
    const emails = await loadAuthEmails({})

    await expect(emails.sendVerification(VERIFICATION)).resolves.toBeUndefined()
  })
})
