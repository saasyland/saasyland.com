import type * as StartServerModule from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { sendDeleteAccountEmail } from "~/src/modules/user/use-cases/send-delete-account-email"
import { USER_EMAIL_PURPOSE } from "~/src/modules/user/user.constants"

import enMessages from "~/messages/en-US/emails.delete-account-email.json"
import plMessages from "~/messages/pl-PL/emails.delete-account-email.json"

const ORIGIN = "http://127.0.0.1:3000"
const USER = { email: "delete@example.test", name: "Ada Lovelace" }

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request(`${ORIGIN}/api/auth/delete-user`)),
}))

const betterAuthLink = (callbackURL: string): string =>
  `${ORIGIN}/api/auth/delete-user/callback?token=emailed-token&callbackURL=${encodeURIComponent(callbackURL)}`

describe("account deletion email", () => {
  it.each([
    { callbackURL: "/app/settings/delete-account", messages: enMessages, path: "" },
    { callbackURL: "/pl-PL/app/settings/delete-account", messages: plMessages, path: "/pl-PL" },
  ])("links $callbackURL to the confirmation page in its language", async ({ callbackURL, messages, path }) => {
    await sendDeleteAccountEmail({ token: "emailed-token", url: betterAuthLink(callbackURL), user: USER })

    const email = getSentEmails(USER.email).at(-1)
    expect(email?.subject).toBe(messages.subject)
    expect(email?.idempotencyKey?.startsWith(`${USER_EMAIL_PURPOSE.DELETE_ACCOUNT}/`)).toBe(true)
    expect(email?.html).toContain(`href="${ORIGIN}${path}/app/settings/delete-account?token=emailed-token"`)
    expect(email?.html).not.toContain("/api/auth/delete-user")
    expect(email?.html).not.toMatch(/\{\w+\}/u)
  })

  it("sends nothing once the address has had its emails for the hour", async () => {
    const recipient = { ...USER, email: "limited@example.test" }
    for (let sent = 0; sent <= RECIPIENT_EMAILS_PER_HOUR; sent += 1) {
      await sendDeleteAccountEmail({ token: `token-${String(sent)}`, url: betterAuthLink("/app/settings/delete-account"), user: recipient })
    }

    expect(getSentEmails(recipient.email)).toHaveLength(RECIPIENT_EMAILS_PER_HOUR)
  })
})
