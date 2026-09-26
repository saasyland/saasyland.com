import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

import { authRateLimitStorage, clientAddress, withinRateLimit } from "~/src/lib/rate-limit"

import { ROUTES } from "~/src/routes"

const input = { key: "sensitive:127.0.0.1", limit: 3, windowSeconds: 60 }

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("atomic rate limits", () => {
  it("enforces the maximum across concurrent requests", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => withinRateLimit(input)))

    expect(results.filter(Boolean)).toHaveLength(input.limit)
  })
  it("allows requests up to the configured maximum", async () => {
    for (let attempt = 0; attempt < input.limit; attempt++) {
      expect(await withinRateLimit(input)).toBe(true)
    }
  })

  it("rejects requests over the maximum", async () => {
    for (let attempt = 0; attempt < input.limit; attempt++) {
      await withinRateLimit(input)
    }

    expect(await withinRateLimit(input)).toBe(false)
  })

  it("resets at the end of the fixed window, without extending it on rejection", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-24T10:00:00Z"))
    expect(await withinRateLimit({ ...input, limit: 1 })).toBe(true)
    vi.setSystemTime(new Date("2026-09-24T10:00:59Z"))
    expect(await withinRateLimit({ ...input, limit: 1 })).toBe(false)
    vi.setSystemTime(new Date("2026-09-24T10:01:00Z"))
    expect(await withinRateLimit({ ...input, limit: 1 })).toBe(true)
  })

  it("isolates action and IP keys", async () => {
    await withinRateLimit({ ...input, limit: 1 })

    expect(await withinRateLimit({ ...input, key: "other:127.0.0.1", limit: 1 })).toBe(true)
  })

  it("rejects requests when the store is unavailable", async () => {
    vi.spyOn(db, "batch").mockRejectedValueOnce(new Error("D1 unavailable"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await withinRateLimit(input)).toBe(false)
  })
})

describe("Better Auth rate-limit storage", () => {
  const key = `203.0.113.9|${ROUTES.API_AUTH.SIGN_IN_EMAIL}`
  const rule = { max: 3, window: 10 }

  it("admits the rule's maximum, then refuses with the seconds left in the window", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-24T10:00:00Z"))
    for (let attempt = 0; attempt < rule.max; attempt++) {
      expect(await authRateLimitStorage.consume(key, rule)).toEqual({ allowed: true, retryAfter: rule.window })
    }
    vi.setSystemTime(new Date("2026-09-24T10:00:04Z"))

    expect(await authRateLimitStorage.consume(key, rule)).toEqual({ allowed: false, retryAfter: 6 })
  })

  it("stores auth counters under their own prefix", async () => {
    await authRateLimitStorage.consume(key, rule)

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

    expect(await authRateLimitStorage.consume(key, rule)).toEqual({ allowed: false, retryAfter: rule.window })
  })
})

describe("client address", () => {
  it("passes a single IPv4 address through", () => {
    expect(clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "203.0.113.1" }))).toBe("203.0.113.1")
  })

  it("groups IPv6 clients by their /64 prefix", () => {
    const prefix = "2001:0db8:0001:0002:0000:0000:0000:0000"

    expect(clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "2001:db8:1:2:3:4:5:6" }))).toBe(prefix)
    expect(clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "2001:db8:1:2:ffff::1" }))).toBe(prefix)
  })

  it("ignores multi-hop and missing headers like Better Auth's limiter", () => {
    expect(clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "203.0.113.1, 198.51.100.2" }))).toBe("127.0.0.1")
    expect(clientAddress(new Headers({ "X-Forwarded-For": "203.0.113.1" }))).toBe("127.0.0.1")
  })
})
