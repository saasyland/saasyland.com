import { waitUntil } from "cloudflare:workers"

import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { AUTH_PROVIDER, EMAIL_LINK_LIFETIME_HOURS, EMAIL_LINK_LIFETIME_SECONDS } from "~/src/integrations/better-auth/auth.constants"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ENVIRONMENT, IP_ADDRESS_HEADER, appHostsForMode } from "~/src/modules/_core/constants/api"
import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

import { SECONDS_PER_HOUR } from "~/src/lib/duration"

import { APP_SLUG } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.resetModules()
})

describe("Cloudflare auth configuration", () => {
  it("reads every session from D1 with Better Auth's default lifetimes", async () => {
    const { sessionConfig } = await auth.$context

    expect(auth.options.session).toStrictEqual({ additionalFields: { country: { input: false, required: false, type: "string" } } })
    expect(sessionConfig).toMatchObject({ expiresIn: 604_800, freshAge: 86_400, updateAge: 86_400 })
  })
  it("leaves the country of a session created outside a request empty", async () => {
    const createdAt = new Date(0)
    const session = { createdAt, expiresAt: createdAt, id: "session", token: "token", updatedAt: createdAt, userId: "user" }

    await expect(auth.options.databaseHooks.session.create.before(session, null)).resolves.toStrictEqual({
      data: { ...session, country: undefined },
    })
  })
  it("uses the database adapter without an external secondary store", () => {
    expect(auth.options.database).toBeTypeOf("function")
    expect(auth.options).not.toHaveProperty("secondaryStorage")
  })
  it("rate limits auth endpoints through the atomic D1 store", () => {
    expect(auth.options.rateLimit).toMatchObject({
      customRules: {
        [ROUTES.API.AUTH.GET_SESSION]: false,
        [ROUTES.API.AUTH.SIGN_OUT]: false,
        [ROUTES.API.AUTH.POLAR.WEBHOOKS]: false,
      },
      enabled: true,
    })
    expect(auth.options.rateLimit).not.toHaveProperty("storage")
  })
  it("preserves verification and session revocation on password reset", () => {
    expect(auth.options.emailAndPassword.requireEmailVerification).toBe(true)
    expect(auth.options.emailAndPassword.revokeSessionsOnPasswordReset).toBe(true)
  })
  it("sends a fresh verification link when an unverified account signs in", () => {
    expect(auth.options.emailVerification).toMatchObject({ sendOnSignIn: true, sendOnSignUp: true })
  })
  it("gives verification and reset links the lifetime the emails state", () => {
    expect(auth.options.emailVerification.expiresIn).toBe(EMAIL_LINK_LIFETIME_SECONDS)
    expect(auth.options.emailAndPassword.resetPasswordTokenExpiresIn).toBe(EMAIL_LINK_LIFETIME_SECONDS)
    expect(EMAIL_LINK_LIFETIME_SECONDS).toBe(EMAIL_LINK_LIFETIME_HOURS * SECONDS_PER_HOUR)
  })
  it("retains both OAuth providers and encrypted tokens", () => {
    expect(Object.keys(auth.options.socialProviders)).toEqual([AUTH_PROVIDER.GITHUB, AUTH_PROVIDER.GOOGLE])
    expect(auth.options.account.encryptOAuthTokens).toBe(true)
  })
  it("links accounts only through provider-verified emails", () => {
    expect(auth.options.account.accountLinking).not.toHaveProperty("trustedProviders")
  })
  it("uses only Cloudflare's connecting IP for request attribution", () => {
    expect(auth.options.advanced.ipAddress.ipAddressHeaders).toEqual([IP_ADDRESS_HEADER])
  })
  it("generates UUIDv7 identifiers", () => {
    expect(auth.options.advanced.database.generateId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
  })
  it("hands background work to the Worker's waitUntil", () => {
    expect(auth.options.advanced.backgroundTasks.handler).toBe(waitUntil)
  })
  it("names cookies after the app and marks them Secure outside local modes", async () => {
    const { authCookies } = await auth.$context

    expect(auth.options.advanced.cookiePrefix).toBe(APP_SLUG)
    expect(auth.options.advanced.useSecureCookies).toBe(false)
    expect(authCookies.sessionToken.name).toBe(`${APP_SLUG}.session_token`)
  })
  it("trusts only the local hosts in test mode", () => {
    expect(auth.options.baseURL.allowedHosts).toEqual(appHostsForMode(ENVIRONMENT.TEST))
    expect(auth.options.baseURL.allowedHosts.some((host) => host.includes("*") || host.includes("workers.dev"))).toBe(false)
  })
  it("serves its endpoints under the auth routes' base path", () => {
    expect(auth.options.basePath).toBe(ROUTES.API.AUTH.BASE)
  })
  it("sends API errors to the sign-in page", () => {
    expect(auth.options.onAPIError.errorURL).toBe(ROUTES.AUTH.SIGN_IN)
  })
  it("hashes verification identifiers in D1", () => {
    expect(auth.options.verification).toEqual({ storeIdentifier: "hashed" })
  })
  it("runs every plugin in the order Better Auth applies them", () => {
    expect(auth.options.plugins.map(({ id }) => id)).toStrictEqual([
      "admin",
      "two-factor",
      "last-login-method",
      "invitation",
      "have-i-been-pwned",
      "password-change-notice",
      "license-retention",
      "polar",
      "polar-verified-customer",
      "tanstack-start-cookies",
    ])
  })
  it("keeps TanStack Start cookies last and runs without multi-session or telemetry", () => {
    expect(auth.options.plugins.at(-1)?.id).toBe("tanstack-start-cookies")
    expect(auth.options.plugins.map((plugin) => plugin.id)).not.toContain("multi-session")
    expect(auth.options).not.toHaveProperty("telemetry")
  })
})

describe("Better Auth rate-limit storage", () => {
  const key = `203.0.113.9|${ROUTES.API.AUTH.SIGN_IN_EMAIL}`
  const rule = { max: 3, window: 10 }
  const { customStorage } = auth.options.rateLimit

  it("admits the rule's maximum, then refuses with the seconds left in the window", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-24T10:00:00Z"))
    for (let attempt = 0; attempt < rule.max; attempt++) {
      expect(await customStorage.consume(key, rule)).toEqual({ allowed: true, retryAfter: rule.window })
    }
    vi.setSystemTime(new Date("2026-09-24T10:00:04Z"))

    expect(await customStorage.consume(key, rule)).toEqual({ allowed: false, retryAfter: 6 })
  })

  it("stores auth counters under their own prefix", async () => {
    await customStorage.consume(key, rule)

    expect(
      await db
        .select()
        .from(rateLimit)
        .where(eq(rateLimit.key, `auth:${key}`)),
    ).toHaveLength(1)
  })

  it("refuses requests when the store is unavailable", async () => {
    vi.spyOn(db, "batch").mockRejectedValueOnce(new Error("D1 unavailable"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await customStorage.consume(key, rule)).toEqual({ allowed: false, retryAfter: rule.window })
  })
})
