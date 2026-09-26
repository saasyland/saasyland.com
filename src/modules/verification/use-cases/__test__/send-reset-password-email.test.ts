import { env } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { sendResetPasswordEmail } from "~/src/modules/verification/use-cases/send-reset-password-email"

import deMessages from "~/messages/de-DE/emails.reset-password-email.json"
import enMessages from "~/messages/en-US/emails.reset-password-email.json"
import plMessages from "~/messages/pl-PL/emails.reset-password-email.json"

const ORIGIN = "http://127.0.0.1:3000"
const resetUrl = (callbackURL: string) => `${ORIGIN}/api/auth/reset-password/reset-token?${new URLSearchParams({ callbackURL })}`
const USER = { email: "ada@example.test", name: "Ada Lovelace" }

const EMAIL_SCHEMA = zod.object({ from: zod.string(), html: zod.string(), subject: zod.string(), to: zod.string() })
const deliveries: { body: zod.infer<typeof EMAIL_SCHEMA>; idempotencyKey: string | null }[] = []

beforeEach(() => {
  deliveries.length = 0
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init)
    expect(request.url).toBe("https://api.resend.com/emails")
    expect(request.method).toBe("POST")
    deliveries.push({ body: EMAIL_SCHEMA.parse(await request.json()), idempotencyKey: request.headers.get("idempotency-key") })
    return Response.json({ id: crypto.randomUUID() })
  })
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

      expect(deliveries).toHaveLength(1)
      expect(deliveries[0]?.idempotencyKey).toBe("reset-password/reset-token")
      expect(deliveries[0]?.body).toMatchObject({ from: env.RESEND_EMAIL_FROM, subject: messages.subject, to: USER.email })
      const html = deliveries[0]?.body.html
      expect(html).toContain(`lang="${locale}"`)
      expect(html).toContain(`href="${url}"`)
      expect(html).toContain(messages.heading)
      expect(html).toContain(messages.button)
      expect(html).toContain(USER.name)
      expect(html).not.toContain("{name}")
    },
  )
})
