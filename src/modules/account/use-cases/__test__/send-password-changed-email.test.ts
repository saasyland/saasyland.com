import { env } from "cloudflare:workers"

import { describe, expect, it } from "vite-plus/test"

import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"

import { sendPasswordChangedEmail } from "~/src/modules/account/use-cases/send-password-changed-email"

import enMessages from "~/messages/en-US/emails.password-changed-email.json"
import ukMessages from "~/messages/uk-UA/emails.password-changed-email.json"
import { APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"

const ORIGIN = "http://127.0.0.1:3000"
const USER = { email: "ada@example.test", name: "Ada Lovelace" }

describe("password changed email delivery", () => {
  it.each([
    { callbackURL: "/auth/callback", messages: enMessages, path: "" },
    { callbackURL: "/uk-UA/auth/callback", messages: ukMessages, path: "/uk-UA" },
  ])("tells the account in the locale of $callbackURL, with a way back in and a way out", async ({ callbackURL, messages, path }) => {
    await sendPasswordChangedEmail({ callbackURL, user: USER })

    const deliveries = getSentEmails(USER.email)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]).toMatchObject({
      from: env.RESEND_EMAIL_FROM,
      subject: messages.subject.replace("{appName}", APP_NAME),
      to: [USER.email],
    })
    expect(deliveries[0]?.idempotencyKey?.startsWith(`${EMAIL_PURPOSE.PASSWORD_CHANGED}/`)).toBe(true)
    const html = deliveries[0]?.html
    expect(html).toContain(`lang="${path === "" ? "en-US" : "uk-UA"}"`)
    expect(html).toContain(`href="${ORIGIN}${path}/auth/sign-in"`)
    expect(html).toContain(`href="${ORIGIN}${path}/auth/forgot-password"`)
    expect(html).toContain(`href="mailto:${CONTACT_EMAIL}"`)
    expect(html).toContain(USER.name)
    expect(html).not.toMatch(/\{\w+\}|<\/?(?:reset|mail)>/u)
  })
})
