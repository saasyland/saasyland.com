import { waitUntil } from "cloudflare:workers"

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { auth } from "~/src/integrations/better-auth/auth.server"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"

import { authRateLimitStorage } from "~/src/lib/rate-limit"

import { ROUTES } from "~/src/routes"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("Cloudflare auth configuration", () => {
  it("reads every session from D1 with Better Auth's default lifetimes", async () => {
    const { sessionConfig } = await auth.$context

    expect(auth.options).not.toHaveProperty("session")
    expect(sessionConfig).toMatchObject({ expiresIn: 604_800, freshAge: 86_400, updateAge: 86_400 })
  })
  it("uses the database adapter without an external secondary store", () => {
    expect(auth.options.database).toBeTypeOf("function")
    expect(auth.options).not.toHaveProperty("secondaryStorage")
  })
  it("rate limits auth endpoints through the atomic D1 store", () => {
    expect(auth.options.rateLimit).toMatchObject({
      customRules: {
        [ROUTES.API_AUTH.GET_SESSION]: false,
        [ROUTES.API_AUTH.POLAR_WEBHOOKS]: false,
        [ROUTES.API_AUTH.SIGN_OUT]: false,
      },
      customStorage: authRateLimitStorage,
      enabled: true,
    })
    expect(auth.options.rateLimit).not.toHaveProperty("storage")
  })
  it("preserves verification and session revocation on password reset", () => {
    expect(auth.options.emailAndPassword.requireEmailVerification).toBe(true)
    expect(auth.options.emailAndPassword.revokeSessionsOnPasswordReset).toBe(true)
  })
  it("retains both OAuth providers and encrypted tokens", () => {
    expect(Object.keys(auth.options.socialProviders)).toEqual(["github", "google"])
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

    expect(auth.options.advanced.cookiePrefix).toBe("saasyland")
    expect(auth.options.advanced.useSecureCookies).toBe(false)
    expect(authCookies.sessionToken.name).toBe("saasyland.session_token")
  })
  it("trusts only the local hosts in test mode", () => {
    expect(auth.options.baseURL.allowedHosts).toEqual(["localhost:3000", "127.0.0.1:3000"])
    expect(auth.options.baseURL.allowedHosts.some((host) => host.includes("*") || host.includes("workers.dev"))).toBe(false)
  })
  it("sends API errors to the sign-in page", () => {
    expect(auth.options.onAPIError.errorURL).toBe(ROUTES.SIGN_IN)
  })
  it("hashes verification identifiers in D1", () => {
    expect(auth.options.verification).toEqual({ storeIdentifier: "hashed" })
  })
  it("keeps TanStack Start cookies last and runs without multi-session or telemetry", () => {
    expect(auth.options.plugins.at(-1)?.id).toBe("tanstack-start-cookies")
    expect(auth.options.plugins.map((plugin) => plugin.id)).not.toContain("multi-session")
    expect(auth.options).not.toHaveProperty("telemetry")
  })
})
