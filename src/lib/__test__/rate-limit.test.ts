import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { withinRateLimit } from "~/src/lib/rate-limit"

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
