import { env } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"
import { createHash } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { clearSentEmails, getSentEmails, respondAsResend } from "~/src/platform/testing/mocks/providers"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { sendResetPasswordEmail } from "~/src/modules/verification/use-cases/send-reset-password-email"

import deMessages from "~/messages/de-DE/emails.reset-password-email.json"
import enMessages from "~/messages/en-US/emails.reset-password-email.json"
import plMessages from "~/messages/pl-PL/emails.reset-password-email.json"

const ORIGIN = "http://127.0.0.1:3000"
const resetUrl = (callbackURL: string) => `${ORIGIN}/api/auth/reset-password/reset-token?${new URLSearchParams({ callbackURL })}`
const USER = { email: "ada@example.test", name: "Ada Lovelace" }

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex")

beforeEach(() => {
  clearSentEmails()
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => respondAsResend(new Request(input, init)))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("reset password email delivery", () => {
  it.each([
    { callbackURL: "/auth/reset-password", cookie: "pl-PL", locale: "en-US", messages: enMessages },
    { callbackURL: "/pl-PL/auth/reset-password", cookie: "de-DE", locale: "pl-PL", messages: plMessages },
    { callbackURL: "/de-DE/auth/reset-password", cookie: "pl-PL", locale: "de-DE", messages: deMessages },
  ])(
    "sends the reset link in $locale, the locale of the page it was requested from, not the $cookie cookie",
    async ({ callbackURL, cookie, locale, messages }) => {
      vi.mocked(getRequest).mockReturnValue(
        new Request(`${ORIGIN}/_serverFn/request-password-reset`, { headers: { cookie: `${I18N.COOKIE_NAME}=${cookie}` } }),
      )
      const url = resetUrl(callbackURL)

      await sendResetPasswordEmail({ token: "reset-token", url, user: USER })

      const deliveries = getSentEmails(USER.email)
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0]?.idempotencyKey).toBe(`reset-password/${sha256("reset-token")}`)
      expect(deliveries[0]).toMatchObject({ from: env.RESEND_EMAIL_FROM, subject: messages.subject, to: [USER.email] })
      const html = deliveries[0]?.html
      expect(html).toContain(`lang="${locale}"`)
      expect(html).toContain(`href="${url}"`)
      expect(html).toContain(messages.heading)
      expect(html).toContain(messages.button)
      expect(html).toContain(USER.name)
      expect(html).not.toContain("{name}")
    },
  )
})
