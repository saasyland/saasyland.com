import { env } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { account } from "~/src/modules/account/account.schema"
import { sendExistingAccountEmail } from "~/src/modules/account/use-cases/send-existing-account-email"
import { user } from "~/src/modules/user/user.schema"

import deMessages from "~/messages/de-DE/emails.existing-account-email.json"
import enMessages from "~/messages/en-US/emails.existing-account-email.json"
import plMessages from "~/messages/pl-PL/emails.existing-account-email.json"
import { APP_NAME } from "~/src/presentation/branding"

const ORIGIN = "http://127.0.0.1:3000"
const USER = { email: "ada@example.test", id: "ada", name: "Ada Lovelace" }

const linkAccounts = async (providers: readonly string[]) => {
  const id = crypto.randomUUID()
  const holder = { email: `${id}@example.test`, id, name: USER.name }
  await db.insert(user).values({ ...holder, emailVerified: true })
  for (const providerId of providers) {
    await db.insert(account).values({ accountId: `${providerId}-${id}`, id: `${providerId}-${id}`, providerId, userId: id })
  }
  return holder
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("existing account email delivery", () => {
  it.each([
    { callbackURL: "/auth/callback", cookie: "pl-PL", messages: enMessages, path: "", search: "" },
    {
      callbackURL: "/pl-PL/auth/callback?redirect=%2Fpl-PL%2Fapp",
      cookie: "de-DE",
      messages: plMessages,
      path: "/pl-PL",
      search: "?redirect=%2Fpl-PL%2Fapp",
    },
    { callbackURL: `${ORIGIN}/de-DE/auth/callback`, cookie: "pl-PL", messages: deMessages, path: "/de-DE", search: "" },
  ])(
    "links to sign-in and password reset in the locale of $callbackURL, not the $cookie cookie",
    async ({ callbackURL, cookie, messages, path, search }) => {
      vi.mocked(getRequest).mockReturnValue(
        new Request(`${ORIGIN}/api/auth/sign-up/email`, { headers: { cookie: `${I18N.COOKIE_NAME}=${cookie}` } }),
      )

      await sendExistingAccountEmail({ callbackURL, user: USER })

      const deliveries = getSentEmails(USER.email)
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0]).toMatchObject({
        from: env.RESEND_EMAIL_FROM,
        subject: messages.subject.replace("{appName}", APP_NAME),
        to: [USER.email],
      })
      expect(deliveries[0]?.idempotencyKey?.startsWith(`${EMAIL_PURPOSE.EXISTING_ACCOUNT}/`)).toBe(true)
      const html = deliveries[0]?.html
      expect(html).toContain(`href="${ORIGIN}${path}/auth/sign-in${search}"`)
      expect(html).toContain(`href="${ORIGIN}${path}/auth/forgot-password"`)
      expect(html).toContain(messages.button)
      expect(html).toContain(messages.fallback)
      expect(html).toContain(USER.name)
      expect(html).not.toMatch(/\{\w+\}/u)
    },
  )

  it.each([
    {
      methods: "You can sign in with your email and password, GitHub, or Google.",
      providers: [AUTH_PROVIDER.GITHUB, AUTH_PROVIDER.CREDENTIAL, AUTH_PROVIDER.GOOGLE],
    },
    { methods: "You can sign in with GitHub.", providers: [AUTH_PROVIDER.GITHUB] },
    { methods: "You can sign in with your email and password.", providers: [AUTH_PROVIDER.CREDENTIAL] },
  ])("names the sign-in methods the account already has: $providers", async ({ methods, providers }) => {
    const holder = await linkAccounts(providers)

    await sendExistingAccountEmail({ callbackURL: "/auth/callback", user: holder })

    expect(getSentEmails(holder.email)[0]?.html).toContain(methods)
  })

  it("leaves out the sign-in methods when the account has none it can name", async () => {
    const holder = await linkAccounts(["passkey"])

    await sendExistingAccountEmail({ callbackURL: "/auth/callback", user: holder })

    expect(getSentEmails(holder.email)[0]?.html).not.toContain("You can sign in with")
  })

  it("gives every notice its own idempotency key, so a later sign-up attempt is reported again", async () => {
    await sendExistingAccountEmail({ callbackURL: "/auth/callback", user: USER })
    await sendExistingAccountEmail({ callbackURL: "/auth/callback", user: USER })

    const keys = getSentEmails(USER.email).map(({ idempotencyKey }) => idempotencyKey)
    expect(keys).toHaveLength(2)
    expect(new Set(keys).size).toBe(2)
  })

  it("sends at most three notices to one address per hour", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})

    for (let attempt = 0; attempt < 4; attempt++) {
      await sendExistingAccountEmail({ callbackURL: "/auth/callback", user: USER })
    }

    expect(getSentEmails(USER.email)).toHaveLength(3)
    expect(consoleWarn).toHaveBeenCalledWith("[email] existing account email not sent: the recipient reached the hourly limit")
  })
})
