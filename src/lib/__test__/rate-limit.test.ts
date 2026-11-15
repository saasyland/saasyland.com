import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

import { sha256Hex } from "~/src/lib/hex"
import { withinRateLimit, withinRecipientRateLimit } from "~/src/lib/rate-limit"

const EMAIL_KIND = { CONFIRMATION: "confirmation", RESET: "reset" } as const

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

describe("recipient email limits", () => {
  const HOUR_MS = 3_600_000
  const recipient = { kind: EMAIL_KIND.CONFIRMATION, recipient: "Ada@Example.test" }

  it("allows three emails of a kind to an address per hour, whatever the address's case or padding", async () => {
    const results = []
    for (const address of ["Ada@Example.test", "ada@example.test", " ada@example.test ", "ADA@EXAMPLE.TEST"]) {
      results.push(await withinRecipientRateLimit({ ...recipient, recipient: address }))
    }

    expect(results).toStrictEqual([...Array.from({ length: RECIPIENT_EMAILS_PER_HOUR }, () => true), false])
  })

  it("counts each kind of email and each address separately", async () => {
    for (let attempt = 0; attempt < RECIPIENT_EMAILS_PER_HOUR; attempt++) {
      await withinRecipientRateLimit(recipient)
    }

    expect(await withinRecipientRateLimit({ ...recipient, kind: EMAIL_KIND.RESET })).toBe(true)
    expect(await withinRecipientRateLimit({ ...recipient, recipient: "grace@example.test" })).toBe(true)
  })

  it("allows the address again after an hour", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-12T10:00:00.000Z") })
    for (let attempt = 0; attempt <= RECIPIENT_EMAILS_PER_HOUR; attempt++) {
      await withinRecipientRateLimit(recipient)
    }

    vi.setSystemTime(Date.now() + HOUR_MS)

    expect(await withinRecipientRateLimit(recipient)).toBe(true)
  })

  it("stores the address only as a hash", async () => {
    await withinRecipientRateLimit(recipient)

    const keys = await db.select({ key: rateLimit.key }).from(rateLimit)
    expect(keys.map(({ key }) => key)).toStrictEqual([`recipient:${EMAIL_KIND.CONFIRMATION}:${await sha256Hex("ada@example.test")}`])
  })
})
