import { env } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { signUpWithPasswordMutation } from "~/src/modules/account/use-cases/sign-up-with-password"
import { user } from "~/src/modules/user/user.schema"

import { ROUTES } from "~/src/routes"

const ORIGIN = "http://127.0.0.1:3000"
const EMAIL_SCHEMA = zod.object({ from: zod.string(), html: zod.string(), subject: zod.string(), to: zod.string() })
const deliveries: { body: zod.infer<typeof EMAIL_SCHEMA>; idempotencyKey: string | null }[] = []
let failDelivery = false

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

const verifyDeliveredEmail = async () => {
  const verificationLink = deliveries[0]?.body.html.match(/href="(?<url>[^"]+\/auth\/verify-email\?token=[^"]+)"/u)?.groups?.["url"]
  expect(verificationLink).toBeDefined()
  const verificationUrl = new URL(verificationLink!)
  const token = verificationUrl.searchParams.get("token")
  expect(token).toBeTruthy()
  await auth.api.verifyEmail({ headers: getRequest().headers, query: { token: token! } })
}

beforeEach(() => {
  deliveries.length = 0
  failDelivery = false
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init)
    expect(request.url).toBe("https://api.resend.com/emails")
    expect(request.method).toBe("POST")
    const body = EMAIL_SCHEMA.parse(await request.json())
    if (failDelivery) {
      return Response.json({ message: "Provider temporarily unavailable", name: "application_error" }, { status: 503 })
    }
    deliveries.push({ body, idempotencyKey: request.headers.get("idempotency-key") })
    return Response.json({ id: crypto.randomUUID() })
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
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]?.body).toMatchObject({
      from: env.RESEND_EMAIL_FROM,
      subject: "Potwierdź adres e-mail",
      to: body.email,
    })
    expect(deliveries[0]?.body.html).toContain(`${ORIGIN}/pl-PL/auth/verify-email?token=`)
    expect(deliveries[0]?.idempotencyKey).toMatch(/^verify-email\//u)
    expect(deliveries[0]?.body.html).toContain('lang="pl-PL"')

    await verifyDeliveredEmail()
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
      deliveries.length = 0

      const repeated = await signUp(body, `${I18N.COOKIE_NAME}=${cookie}`)

      expect(repeated.token).toBeNull()
      expect(repeated.user.email).toBe(body.email)
      expect(repeated.user.id).not.toBe(first.user.id)
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0]?.body.to).toBe(body.email)
      expect(deliveries[0]?.body.html).toContain(`${ORIGIN}${path}/auth/verify-email?token=`)
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
            "content-type": contentType,
            cookie: `${I18N.COOKIE_NAME}=de-DE`,
            [IP_ADDRESS_HEADER]: "203.0.113.10",
            origin: ORIGIN,
          },
          method: "POST",
        })
        vi.mocked(getRequest).mockReturnValue(request)
        await auth.handler(request)
        await flushWaitUntil()
      }
      await signUpDirectly()
      deliveries.length = 0

      await signUpDirectly()

      expect(deliveries).toHaveLength(1)
      expect(deliveries[0]?.body.html).toContain(`${ORIGIN}${path}/auth/verify-email?token=`)
    },
  )

  it("sends a repeated sign-up called on the server with headers but no request in the default locale", async () => {
    const { email, name, password } = createSignUp()
    const request = new Request(`${ORIGIN}/_serverFn/sign-up`, { headers: { cookie: `${I18N.COOKIE_NAME}=de-DE`, host: "127.0.0.1:3000" } })
    vi.mocked(getRequest).mockReturnValue(request)
    await auth.api.signUpEmail({ body: { email, name, password }, headers: request.headers })
    await flushWaitUntil()
    deliveries.length = 0

    await auth.api.signUpEmail({ body: { email, name, password }, headers: request.headers })
    await flushWaitUntil()

    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]?.body.html).toContain(`${ORIGIN}/auth/verify-email?token=`)
  })

  it("recovers a failed initial email delivery when signup is retried and lets the customer verify and sign in", async () => {
    const body = createSignUp()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    failDelivery = true

    const first = await signUp(body)

    expect(deliveries).toHaveLength(0)
    expect(first.user.emailVerified).toBe(false)
    expect(consoleError.mock.calls.flat().some((value) => String(value).includes("Failed to run background task:"))).toBe(true)
    const accounts = await db.select().from(user).where(eq(user.email, body.email))
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.emailVerified).toBe(false)
    failDelivery = false

    const repeated = await signUp(body)

    expect(repeated.user.id).not.toBe(first.user.id)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]?.body.to).toBe(body.email)
    await verifyDeliveredEmail()
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
    deliveries.length = 0

    const repeated = await signUp(body)

    expect(repeated.token).toBeNull()
    expect(repeated.user.email).toBe(body.email)
    expect(repeated.user.id).not.toBe(first.user.id)
    expect(deliveries).toHaveLength(0)
  })
})
