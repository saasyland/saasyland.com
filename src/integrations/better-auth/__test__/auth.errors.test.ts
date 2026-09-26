import { BetterFetchError } from "@better-fetch/fetch"
import { BASE_ERROR_CODES } from "better-auth"
import { APIError } from "better-auth/api"
import { admin } from "better-auth/plugins/admin"
import { TWO_FACTOR_ERROR_CODES } from "better-auth/plugins/two-factor"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vite-plus/test"

import { AUTH_ERRORS, authErrorKey, authErrorKeyFromSearch } from "~/src/integrations/better-auth/auth.errors"

const RATE_LIMIT_BODY = { message: "Too many requests. Please try again later." }
const APP_FALLBACK_CODES = new Set(["TOO_MANY_REQUESTS", "UNKNOWN_ERROR"])
const PROVIDER_CALLBACK_CODES = new Set([
  "ACCESS_DENIED",
  "INVALID_REQUEST",
  "INVALID_SCOPE",
  "SERVER_ERROR",
  "TEMPORARILY_UNAVAILABLE",
  "UNAUTHORIZED_CLIENT",
  "UNSUPPORTED_RESPONSE_TYPE",
])
const BETTER_AUTH_SOURCES = [
  "api/routes/callback.mjs",
  "api/routes/session.mjs",
  "oauth2/errors.mjs",
  "oauth2/link-account.mjs",
  "oauth2/state.mjs",
  "state.mjs",
]

const readBetterAuthSource = (path: string): string => readFileSync(resolve("node_modules/better-auth/dist", path), "utf8")

describe("auth error key", () => {
  it("maps every declared code carried on the error, on its body or in a redirect", () => {
    expect.hasAssertions()

    for (const [code, key] of Object.entries(AUTH_ERRORS)) {
      expect(authErrorKey({ code })).toBe(key)
      expect(authErrorKey({ body: { code } })).toBe(key)
      expect(authErrorKeyFromSearch(code)).toBe(key)
      expect(authErrorKeyFromSearch(code.toLowerCase())).toBe(key)
    }
  })

  it("groups related Better Auth codes onto one user-facing message", () => {
    expect(authErrorKey(new APIError("UNAUTHORIZED", { code: "UNAUTHORIZED", message: "Unauthorized" }))).toBe("sessionExpired")
    expect(authErrorKey({ body: { code: "SESSION_NOT_FRESH" } })).toBe("sessionExpired")
    expect(authErrorKey({ code: "YOU_ARE_NOT_ALLOWED_TO_BAN_USERS" })).toBe("forbidden")
    expect(authErrorKey({ code: "TOKEN_EXPIRED" })).toBe(authErrorKey({ code: "INVALID_TOKEN" }))
    expect(authErrorKey({ code: "INVALID_REDIRECT_URL" })).toBe("requestBlocked")
  })

  it("maps Better Auth rate-limit rejections, which carry no code, to the retry message", () => {
    expect(authErrorKey({ ...RATE_LIMIT_BODY, status: 429, statusText: "Too Many Requests" })).toBe(AUTH_ERRORS.TOO_MANY_REQUESTS)
    expect(authErrorKey(new BetterFetchError(429, "Too Many Requests", RATE_LIMIT_BODY))).toBe(AUTH_ERRORS.TOO_MANY_REQUESTS)
    expect(authErrorKey(new APIError("TOO_MANY_REQUESTS", RATE_LIMIT_BODY))).toBe(AUTH_ERRORS.TOO_MANY_REQUESTS)
    expect(authErrorKey({ code: "NOT_A_REAL_CODE", status: 429 })).toBe(AUTH_ERRORS.TOO_MANY_REQUESTS)
  })

  it("keeps a specific code ahead of its 429 status", () => {
    const locked = new APIError("TOO_MANY_REQUESTS", TWO_FACTOR_ERROR_CODES.ACCOUNT_TEMPORARILY_LOCKED)

    expect(locked.statusCode).toBe(429)
    expect(authErrorKey(locked)).toBe(AUTH_ERRORS.ACCOUNT_TEMPORARILY_LOCKED)
  })

  it.each([
    ["a string", "invalid"],
    ["null", null],
    ["an empty object", {}],
    ["a numeric code", { code: 404 }],
    ["an unknown code", { code: "NOT_A_REAL_CODE" }],
    ["an empty body", { body: {} }],
    ["a numeric body code", { body: { code: 500 } }],
    ["a named status without a status code", { status: "TOO_MANY_REQUESTS" }],
    ["another failure status", { status: 500, statusCode: 500 }],
  ])("returns the generic message for %s", (_label, error) => {
    expect(authErrorKey(error)).toBe(AUTH_ERRORS.UNKNOWN_ERROR)
  })

  it.each(["constructor", "toString", "__proto__"])("rejects inherited object keys: %s", (code) => {
    expect(authErrorKey({ code })).toBe(AUTH_ERRORS.UNKNOWN_ERROR)
    expect(authErrorKey({ body: { code } })).toBe(AUTH_ERRORS.UNKNOWN_ERROR)
    expect(authErrorKeyFromSearch(code)).toBe(AUTH_ERRORS.UNKNOWN_ERROR)
  })
})

describe("auth error key from a redirect search param", () => {
  it.each([undefined, ""])("reports no error for %j", (error) => {
    expect(authErrorKeyFromSearch(error)).toBeUndefined()
  })

  it.each([
    ["access_denied", "signInCancelled"],
    ["Access_Denied", "signInCancelled"],
    ["state_mismatch", "socialSignInFailed"],
    ["account_not_linked", "accountNotLinked"],
    ["email_not_verified", "emailNotVerified"],
    ["BANNED_USER", "accountSuspended"],
    ["banned_user", "accountSuspended"],
    ["invalid_code", "invalidCode"],
    ["INVALID_TOKEN", "invalidLink"],
    ["UNKNOWN", "unknownError"],
    ["<script>alert(1)</script>", "unknownError"],
  ])("maps %s to %s", (error, key) => {
    expect(authErrorKeyFromSearch(error)).toBe(key)
  })
})

describe("installed Better Auth error codes", () => {
  it("maps only codes that Better Auth or an OAuth provider can produce", () => {
    expect.hasAssertions()
    const tables = new Set([...Object.keys(BASE_ERROR_CODES), ...Object.keys(admin().$ERROR_CODES), ...Object.keys(TWO_FACTOR_ERROR_CODES)])
    const sources = BETTER_AUTH_SOURCES.map((path) => readBetterAuthSource(path)).join("\n")

    for (const code of Object.keys(AUTH_ERRORS).filter((value) => !APP_FALLBACK_CODES.has(value) && !PROVIDER_CALLBACK_CODES.has(value))) {
      const redirectCode = code.toLowerCase()
      const produced =
        tables.has(code) ||
        sources.includes(`code: "${code}"`) ||
        sources.includes(`"${redirectCode}"`) ||
        sources.includes(`"${redirectCode.replaceAll("_", " ")}"`)
      expect(produced, code).toBe(true)
    }
  })

  it("still answers rate-limited requests without an error code", () => {
    const limiter = readBetterAuthSource("api/rate-limiter/index.mjs")

    expect(limiter).toContain(`JSON.stringify({ message: "${RATE_LIMIT_BODY.message}" })`)
    expect(limiter).toContain("status: 429")
  })
})
