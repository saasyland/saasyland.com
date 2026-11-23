import { env } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { failNextResendDelivery } from "~/src/platform/testing/lib/resend"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { EMAIL_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { ACCOUNT_EMAIL_PURPOSE } from "~/src/modules/account/account.constants"
import { signUpWithPasswordMutation } from "~/src/modules/account/use-cases/sign-up-with-password"
import { user } from "~/src/modules/user/user.schema"
import { VERIFICATION_EMAIL_PURPOSE } from "~/src/modules/verification/verification.constants"

import { APP_SLUG } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

const ORIGIN = "http://127.0.0.1:3000"
const RESEND_LIMIT = 256
const A_MINUTE_MS = 60_000

const signUpResponseSchema = zod.object({ token: zod.null(), user: zod.record(zod.string(), zod.unknown()) })

const createSignUp = () => ({
  callbackURL: "/pl-PL/app",
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
  const verificationLink = getSentEmails(email)
    .at(-1)
    ?.html.match(/href="(?<url>[^"]+\/auth\/verify-email\?token=[^"]+)"/u)?.groups?.["url"]
  expect(verificationLink).toBeDefined()
  const token = new URL(verificationLink!).searchParams.get("token")
  expect(token).toBeTruthy()
  return token!
}

const verifyDeliveredEmail = async (email: string) => {
  await auth.api.verifyEmail({ headers: getRequest().headers, query: { token: deliveredVerificationToken(email) } })
}

const aMinuteLater = (): void => {
  vi.useFakeTimers({ now: Date.now() + A_MINUTE_MS, toFake: ["Date"] })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("production signup verification delivery", () => {
  it("sends a rendered verification email in the sign-up page's locale in the background, whatever the locale cookie says", async () => {
    const body = createSignUp()

    const result = await signUp(body)

    expect(result.signedIn).toBe(true)
    expect(result.user).toMatchObject({ email: body.email, emailVerified: false })
    const deliveries = getSentEmails(body.email)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]).toMatchObject({
      from: env.RESEND_EMAIL_FROM,
      subject: "Potwierdź adres e-mail",
      to: [body.email],
    })
    expect(deliveries[0]?.html).toContain(`${ORIGIN}/pl-PL/auth/verify-email?token=`)
    expect(deliveries[0]?.idempotencyKey).toMatch(new RegExp(`^${VERIFICATION_EMAIL_PURPOSE.VERIFY_EMAIL}/[0-9a-f]{64}$`, "u"))
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
      aMinuteLater()

      const repeated = await signUp(body, `${I18N.COOKIE_NAME}=${cookie}`)

      expect(first.signedIn).toBe(true)
      expect(repeated.signedIn).toBe(false)
      expect(repeated.user.email).toBe(body.email)
      expect(repeated.user.id).not.toBe(first.user.id)
      const deliveries = getSentEmails(body.email)
      expect(deliveries).toHaveLength(2)
      expect(deliveries[1]?.html).toContain(`${ORIGIN}${path}/auth/verify-email?token=`)
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
      aMinuteLater()

      await signUpDirectly()

      const deliveries = getSentEmails(email)
      expect(deliveries).toHaveLength(2)
      expect(deliveries[1]?.html).toContain(`${ORIGIN}${path}/auth/verify-email?token=`)
    },
  )

  it("sends a repeated sign-up called on the server with headers but no request in the default locale", async () => {
    const { email, name, password } = createSignUp()
    const request = new Request(`${ORIGIN}/_serverFn/sign-up`, { headers: { cookie: `${I18N.COOKIE_NAME}=de-DE`, host: "127.0.0.1:3000" } })
    vi.mocked(getRequest).mockReturnValue(request)
    await auth.api.signUpEmail({ body: { email, name, password }, headers: request.headers })
    await flushWaitUntil()
    aMinuteLater()

    await auth.api.signUpEmail({ body: { email, name, password }, headers: request.headers })
    await flushWaitUntil()

    const deliveries = getSentEmails(email)
    expect(deliveries).toHaveLength(2)
    expect(deliveries[1]?.html).toContain(`${ORIGIN}/auth/verify-email?token=`)
  })

  it("recovers a failed initial email delivery when signup is retried and lets the customer verify and sign in", async () => {
    const body = createSignUp()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    failNextResendDelivery()

    const first = await signUp(body)

    expect(getSentEmails(body.email)).toHaveLength(0)
    expect(first.user.emailVerified).toBe(false)
    expect(consoleError.mock.calls.flat().some((value) => String(value).includes("Failed to run background task:"))).toBe(true)
    const accounts = await db.select().from(user).where(eq(user.email, body.email))
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.emailVerified).toBe(false)

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
})

describe("repeated sign-up of an existing account", () => {
  it("keeps the generic signup response and tells an already verified account, in the sign-up page's locale, how to sign in", async () => {
    const body = { ...createSignUp(), callbackURL: "/pl-PL/auth/callback?redirect=%2Fpl-PL%2Fapp%2Fsettings" }
    const first = await signUp(body)
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, first.user.id))
    aMinuteLater()

    const repeated = await signUp(body)

    expect(repeated.signedIn).toBe(false)
    expect(repeated.user).toMatchObject({ email: body.email, emailVerified: false })
    expect(repeated.user.id).not.toBe(first.user.id)
    const deliveries = getSentEmails(body.email)
    expect(deliveries).toHaveLength(2)
    expect(deliveries[1]).toMatchObject({ from: env.RESEND_EMAIL_FROM, subject: "Masz już konto w SaaSy Land", to: [body.email] })
    expect(deliveries[1]?.idempotencyKey).toMatch(new RegExp(`^${ACCOUNT_EMAIL_PURPOSE.EXISTING_ACCOUNT}/[0-9a-f]{64}$`, "u"))
    expect(deliveries[1]?.html).toContain('lang="pl-PL"')
    expect(deliveries[1]?.html).toContain(`href="${ORIGIN}/pl-PL/auth/sign-in?redirect=%2Fpl-PL%2Fapp%2Fsettings"`)
    expect(deliveries[1]?.html).toContain(`href="${ORIGIN}/pl-PL/auth/forgot-password"`)
    expect(deliveries[1]?.html).not.toContain("/auth/verify-email")
  })

  it("answers an existing verified and an existing unverified email like a new one, and signs only the new account in", async () => {
    const verified = createSignUp()
    const unverified = createSignUp()
    const verifiedAccount = await signUp(verified)
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, verifiedAccount.user.id))
    await signUp(unverified)
    aMinuteLater()
    const postSignUp = async ({ callbackURL, email, name, password }: ReturnType<typeof createSignUp>, client: number) => {
      const request = new Request(`${ORIGIN}${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_UP_EMAIL}`, {
        body: JSON.stringify({ callbackURL, email, name, password }),
        headers: { [IP_ADDRESS_HEADER]: `203.0.113.${String(client)}`, "content-type": "application/json", origin: ORIGIN },
        method: "POST",
      })
      vi.mocked(getRequest).mockReturnValue(request)
      const response = await auth.handler(request)
      await flushWaitUntil()
      const json: unknown = await response.json()
      return { json, setCookie: response.headers.get("set-cookie"), status: response.status }
    }

    const answers = []
    for (const [client, body] of [createSignUp(), verified, unverified].entries()) {
      answers.push(await postSignUp(body, client + 20))
    }

    const shapes = answers.map(({ json, setCookie, status }) => ({
      keys: Object.keys(signUpResponseSchema.parse(json).user).toSorted(),
      setCookie,
      status,
      token: signUpResponseSchema.parse(json).token,
    }))
    const [created, verifiedShape, unverifiedShape] = shapes
    expect(unverifiedShape).toStrictEqual(verifiedShape)
    expect(verifiedShape).toMatchObject({ setCookie: null, status: 200, token: null })
    expect(created).toMatchObject({ keys: verifiedShape?.keys, status: 200, token: null })
    expect(created?.setCookie).toContain(`${APP_SLUG}.session_token=`)
    expect(getSentEmails(verified.email).map(({ idempotencyKey }) => idempotencyKey?.split("/")[0])).toStrictEqual([
      VERIFICATION_EMAIL_PURPOSE.VERIFY_EMAIL,
      ACCOUNT_EMAIL_PURPOSE.EXISTING_ACCOUNT,
    ])
    expect(getSentEmails(unverified.email).map(({ idempotencyKey }) => idempotencyKey?.split("/")[0])).toStrictEqual([
      VERIFICATION_EMAIL_PURPOSE.VERIFY_EMAIL,
      VERIFICATION_EMAIL_PURPOSE.VERIFY_EMAIL,
    ])
  })

  it("tells an already verified account at most three times an hour, however often someone signs up with it", async () => {
    const body = createSignUp()
    const first = await signUp(body)
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, first.user.id))
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})

    for (let attempt = 0; attempt < 4; attempt++) {
      aMinuteLater()
      await signUp(body)
    }

    const notices = getSentEmails(body.email).filter(
      ({ idempotencyKey }) => idempotencyKey?.startsWith(`${ACCOUNT_EMAIL_PURPOSE.EXISTING_ACCOUNT}/`) === true,
    )
    expect(notices).toHaveLength(3)
    expect(consoleWarn).toHaveBeenCalledWith("[email] existing account email not sent: the recipient reached the hourly limit")
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

describe("verification email link", () => {
  it("keeps the sign-up's redirect and locale, and always points at this site's verification page", async () => {
    const body = { ...createSignUp(), callbackURL: "/pl-PL/auth/callback?redirect=%2Fpl-PL%2Fapp%2Fsettings" }

    await signUp(body)

    expect(getSentEmails(body.email)[0]?.html).toContain(`${ORIGIN}/pl-PL/auth/verify-email?redirect=%2Fpl-PL%2Fapp%2Fsettings&amp;token=`)
  })

  it("links to the verification page in the default locale when Better Auth's link names no callback", async () => {
    const email = `signup-${crypto.randomUUID()}@example.test`
    vi.mocked(getRequest).mockReturnValue(new Request(`${ORIGIN}${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_UP_EMAIL}`))

    await auth.options.emailVerification.sendVerificationEmail({
      token: "verification-token",
      url: `${ORIGIN}${ROUTES.API_AUTH_VERIFY_EMAIL}?token=verification-token`,
      user: { createdAt: new Date(), email, emailVerified: false, id: "user-id", name: "Ada Lovelace", updatedAt: new Date() },
    })

    expect(getSentEmails(email)[0]?.html).toContain(`href="${ORIGIN}${ROUTES.VERIFY_EMAIL}?token=verification-token"`)
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
      aMinuteLater()
    }

    expect(getSentEmails(email)).toHaveLength(3)
    expect(consoleWarn).toHaveBeenCalledWith("[email] verification email not sent: the recipient reached the hourly limit")
  })
})
