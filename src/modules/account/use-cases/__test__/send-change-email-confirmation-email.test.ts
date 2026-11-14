import { env } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"
import { createHash } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { sendChangeEmailConfirmationEmail } from "~/src/modules/account/use-cases/send-change-email-confirmation-email"

import deMessages from "~/messages/de-DE/emails.change-email-confirmation-email.json"
import enMessages from "~/messages/en-US/emails.change-email-confirmation-email.json"
import plMessages from "~/messages/pl-PL/emails.change-email-confirmation-email.json"

const ORIGIN = "http://127.0.0.1:3000"
const confirmUrl = (callbackURL: string) => `${ORIGIN}/api/auth/verify-email?${new URLSearchParams({ callbackURL, token: "change-token" })}`
const NEW_EMAIL = "ada.new@example.test"
const USER = { email: "ada@example.test", name: "Ada Lovelace" }

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex")

afterEach(() => {
  vi.restoreAllMocks()
})

describe("change email confirmation delivery", () => {
  it.each([
    { callbackURL: "/app", cookie: "pl-PL", locale: "en-US", messages: enMessages },
    { callbackURL: "/pl-PL/app", cookie: "de-DE", locale: "pl-PL", messages: plMessages },
    { callbackURL: "/de-DE/app", cookie: "pl-PL", locale: "de-DE", messages: deMessages },
  ])(
    "asks the current address to confirm in $locale, the locale of the page the change started on, not the $cookie cookie",
    async ({ callbackURL, cookie, locale, messages }) => {
      vi.mocked(getRequest).mockReturnValue(
        new Request(`${ORIGIN}/_serverFn/change-email`, { headers: { cookie: `${I18N.COOKIE_NAME}=${cookie}` } }),
      )
      const url = confirmUrl(callbackURL)

      await sendChangeEmailConfirmationEmail({ newEmail: NEW_EMAIL, token: "change-token", url, user: USER })

      const deliveries = getSentEmails(USER.email)
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0]?.idempotencyKey).toBe(`${EMAIL_PURPOSE.CHANGE_EMAIL_CONFIRMATION}/${sha256("change-token")}`)
      expect(deliveries[0]).toMatchObject({ from: env.RESEND_EMAIL_FROM, subject: messages.subject, to: [USER.email] })
      const html = deliveries[0]?.html
      expect(html).toContain(`lang="${locale}"`)
      expect(html).toContain(`href="${url.replaceAll("&", "&amp;")}"`)
      expect(html).toContain(messages.heading)
      expect(html).toContain(messages.button)
      expect(html).toContain(USER.name)
      expect(html).toContain(NEW_EMAIL)
      expect(html).not.toContain("{newEmail}")
    },
  )
})
