import { env } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { createHash } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"
import { clearSentEmails, getSentEmails, respondAsResend } from "~/src/platform/testing/mocks/providers"

import { EMAIL_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { signUpWithPasswordMutation } from "~/src/modules/account/use-cases/sign-up-with-password"
import { user } from "~/src/modules/user/user.schema"

import { ROUTES } from "~/src/routes"

const ORIGIN = "http://127.0.0.1:3000"
const RESEND_LIMIT = 256
let failDelivery = false

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex")

const createSignUp = () => ({
  callbackURL: "/pl-PL/app",
  confirmPassword: "SignupPassword123!",
  email: `signup-${crypto.randomUUID()}@example.test`,
  name: "Test Customer",
  password: "SignupPassword123!",
})

const signUp = async (body: ReturnType<typeof createSignUp>, cookie = `${I18N.COOKIE_NAME}=de-DE`) => {
  const request = new Request(`${ORIGIN}/_serverFn/sign-up`, {
    body: JSON.stringify({ data: body }),
    headers: {
      "content-type": "application/json",
      cookie,
      host: "127.0.0.1:3000",
      origin: ORIGIN,
    },
    method: "POST",
  })
  await request.json()
  vi.mocked(getRequest).mockReturnValue(request)
  const result = await executeMutation(signUpWithPasswordMutation, body)
  await flushWaitUntil()
  return result
}

const deliveredVerificationToken = (email: string): string => {
  const verificationLink = getSentEmails(email)[0]?.html.match(/href="(?<url>[^"]+\/auth\/verify-email\?token=[^"]+)"/u)?.groups?.["url"]
  expect(verificationLink).toBeDefined()
  const token = new URL(verificationLink!).searchParams.get("token")
  expect(token).toBeTruthy()
  return token!
}

const verifyDeliveredEmail = async (email: string) => {
  await auth.api.verifyEmail({ headers: getRequest().headers, query: { token: deliveredVerificationToken(email) } })
}

beforeEach(() => {
  clearSentEmails()
  failDelivery = false
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    if (failDelivery) {
      return Promise.resolve(Response.json({ message: "Provider temporarily unavailable", name: "application_error" }, { status: 503 }))
    }
    return respondAsResend(new Request(input, init))
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("production signup verification delivery", () => {
  it("sends a rendered verification email in the sign-up page's locale in the background, whatever the locale cookie says", async () => {
    const body = createSignUp()

    const result = await signUp(body)

    expect(result.token).toBeNull()
    expect(result.user).toMatchObject({ email: body.email, emailVerified: false })
    const deliveries = getSentEmails(body.email)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]).toMatchObject({
      from: env.RESEND_EMAIL_FROM,
      subject: "Potwierdź adres e-mail",
      to: [body.email],
    })
    expect(deliveries[0]?.html).toContain(`${ORIGIN}/pl-PL/auth/verify-email?token=`)
    expect(deliveries[0]?.idempotencyKey).toBe(`verify-email/${sha256(deliveredVerificationToken(body.email))}`)
    expect(deliveries[0]?.html).toContain('lang="pl-PL"')

    await verifyDeliveredEmail(body.email)
    const verified = await db.select().from(user).where(eq(user.id, result.user.id))
    expect(verified[0]?.emailVerified).toBe(true)
  })

  it.each([
    { callbackURL: "/app", cookie: "pl-PL", path: "" },
    { callbackURL: "/de-DE/app", cookie: "pl-PL", path: "/de-DE" },
    { callbackURL: "/pl-PL/app", cookie: "de-DE", path: "/pl-PL" },
  ])(
    "sends the repeated signup email in the locale of the sign-up page $callbackURL, not the $cookie cookie",
    async ({ callbackURL, cookie, path }) => {
      const body = { ...createSignUp(), callbackURL }
      const first = await signUp(body, `${I18N.COOKIE_NAME}=${cookie}`)
      clearSentEmails()

      const repeated = await signUp(body, `${I18N.COOKIE_NAME}=${cookie}`)

      expect(repeated.token).toBeNull()
      expect(repeated.user.email).toBe(body.email)
      expect(repeated.user.id).not.toBe(first.user.id)
      const deliveries = getSentEmails(body.email)
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0]?.html).toContain(`${ORIGIN}${path}/auth/verify-email?token=`)
      const accounts = await db.select().from(user).where(eq(user.email, body.email))
      expect(accounts).toHaveLength(1)
      expect(accounts[0]?.id).toBe(first.user.id)
    },
  )

  it.each([
    { callback: { callbackURL: "/pl-PL/app" }, contentType: "application/json", path: "/pl-PL" },
    { callback: { callbackURL: `${ORIGIN}/pl-PL/app` }, contentType: "application/json", path: "/pl-PL" },
    { callback: {}, contentType: "application/json", path: "" },
    { callback: { callbackURL: "/pl-PL/app" }, contentType: "application/x-www-form-urlencoded", path: "/pl-PL" },
  ])(
    "sends a repeated $contentType sign-up posted straight to Better Auth in the locale of its callback $callback",
    async ({ callback, contentType, path }) => {
      const { email, name, password } = createSignUp()
      const fields = { ...callback, email, name, password }
      const body = contentType === "application/json" ? JSON.stringify(fields) : new URLSearchParams(fields).toString()
      const signUpDirectly = async () => {
        const request = new Request(`${ORIGIN}${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_UP_EMAIL}`, {
          body,
          headers: {
            [IP_ADDRESS_HEADER]: "203.0.113.10",
            "content-type": contentType,
            cookie: `${I18N.COOKIE_NAME}=de-DE`,
            origin: ORIGIN,
          },
          method: "POST",
        })
        vi.mocked(getRequest).mockReturnValue(request)
        await auth.handler(request)
        await flushWaitUntil()
      }
      await signUpDirectly()
      clearSentEmails()

      await signUpDirectly()

      const deliveries = getSentEmails(email)
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0]?.html).toContain(`${ORIGIN}${path}/auth/verify-email?token=`)
    },
  )

  it("sends a repeated sign-up called on the server with headers but no request in the default locale", async () => {
    const { email, name, password } = createSignUp()
    const request = new Request(`${ORIGIN}/_serverFn/sign-up`, { headers: { cookie: `${I18N.COOKIE_NAME}=de-DE`, host: "127.0.0.1:3000" } })
    vi.mocked(getRequest).mockReturnValue(request)
    await auth.api.signUpEmail({ body: { email, name, password }, headers: request.headers })
    await flushWaitUntil()
    clearSentEmails()

    await auth.api.signUpEmail({ body: { email, name, password }, headers: request.headers })
    await flushWaitUntil()

    const deliveries = getSentEmails(email)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]?.html).toContain(`${ORIGIN}/auth/verify-email?token=`)
  })

  it("recovers a failed initial email delivery when signup is retried and lets the customer verify and sign in", async () => {
    const body = createSignUp()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    failDelivery = true

    const first = await signUp(body)

    expect(getSentEmails(body.email)).toHaveLength(0)
    expect(first.user.emailVerified).toBe(false)
    expect(consoleError.mock.calls.flat().some((value) => String(value).includes("Failed to run background task:"))).toBe(true)
    const accounts = await db.select().from(user).where(eq(user.email, body.email))
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.emailVerified).toBe(false)
    failDelivery = false

    const repeated = await signUp(body)

    expect(repeated.user.id).not.toBe(first.user.id)
    expect(getSentEmails(body.email)).toHaveLength(1)
    await verifyDeliveredEmail(body.email)
    const session = await auth.api.signInEmail({
      body: { email: body.email, password: body.password },
      headers: getRequest().headers,
    })
    expect(session.token).toBeTypeOf("string")
    expect(session.user).toMatchObject({ email: body.email, emailVerified: true, id: first.user.id })
  })

  it("keeps the generic signup response without sending verification to an already verified account", async () => {
    const body = createSignUp()
    const first = await signUp(body)
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, first.user.id))
    clearSentEmails()

    const repeated = await signUp(body)

    expect(repeated.token).toBeNull()
    expect(repeated.user.email).toBe(body.email)
    expect(repeated.user.id).not.toBe(first.user.id)
    expect(getSentEmails(body.email)).toHaveLength(0)
  })
})

describe("verification email idempotency", () => {
  it("delivers verification to the longest address the sign-up form accepts, within Resend's idempotency key limit", async () => {
    const domain = "@example.test"
    const body = { ...createSignUp(), email: `${"a".repeat(EMAIL_MAX_LENGTH - domain.length)}${domain}` }

    await signUp(body)

    const deliveries = getSentEmails(body.email)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]?.idempotencyKey?.length).toBeLessThanOrEqual(RESEND_LIMIT)
    await verifyDeliveredEmail(body.email)
    const verified = await db.select().from(user).where(eq(user.email, body.email))
    expect(verified[0]?.emailVerified).toBe(true)
  })
})

describe("verification email limits", () => {
  it("sends at most three verification emails to one address per hour, however often it signs up", async () => {
    const { email, name, password } = createSignUp()
    const request = new Request(`${ORIGIN}/_serverFn/sign-up`, { headers: { host: "127.0.0.1:3000" } })
    vi.mocked(getRequest).mockReturnValue(request)
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})

    for (let attempt = 0; attempt < 4; attempt++) {
      const result = await auth.api.signUpEmail({ body: { email, name, password }, headers: request.headers })
      await flushWaitUntil()
      expect(result.user.email).toBe(email)
    }

    expect(deliveries).toHaveLength(3)
    expect(consoleWarn).toHaveBeenCalledWith("[email] verification email not sent: the recipient reached the hourly limit")
  })
})
