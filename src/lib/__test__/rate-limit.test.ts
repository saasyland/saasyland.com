import { eq, lte } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { EXPIRED_COUNTERS_PER_CLEANUP, RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

import { sha256Hex } from "~/src/lib/hex"
import {
  type RateLimitDecision,
  type RateLimitInput,
  consumeRateLimit,
  countRequest,
  rateLimitBatch,
  recipientAllowance,
  withinRateLimit,
  withinRecipientRateLimit,
} from "~/src/lib/rate-limit"

const EMAIL_KIND = { CONFIRMATION: "confirmation", RESET: "reset" } as const
const WINDOW_START = new Date("2026-11-16T10:00:00.000Z")
const PART_OF_A_SECOND_MS = 200
const LATE_IN_THE_WINDOW_MS = 25_200
const SECONDS_LEFT_LATE_IN_THE_WINDOW = 35
const LEFT_FOR_THE_NEXT_REQUEST = 7

const input = { key: "sensitive:127.0.0.1", limit: 3, windowSeconds: 60 }

const countersOf = ({ key }: RateLimitInput) => db.select({ attempts: rateLimit.attempts }).from(rateLimit).where(eq(rateLimit.key, key))

const countAll = async (limits: readonly [RateLimitInput, ...RateLimitInput[]]): Promise<RateLimitDecision> => {
  const { decision, statements } = rateLimitBatch(limits)
  return decision(await db.batch(statements))
}

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

  it("refuses a request it cannot count for the whole window, and logs the storage failure", async () => {
    const outage = new Error("D1 unavailable")
    vi.spyOn(db, "batch").mockRejectedValueOnce(outage)
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await consumeRateLimit(input)).toStrictEqual({ allowed: false, retryAfter: input.windowSeconds })
    expect(errors).toHaveBeenCalledWith("Rate-limit storage unavailable", outage)
  })

  it("hands a storage failure to the caller of countRequest instead of refusing the request", async () => {
    const outage = new Error("D1 unavailable")
    vi.spyOn(db, "batch").mockRejectedValueOnce(outage)
    const errors = vi.spyOn(console, "error")

    await expect(countRequest(input)).rejects.toBe(outage)
    expect(errors).not.toHaveBeenCalled()
  })

  it("answers a refused request with the seconds left in the window that refused it", async () => {
    vi.useFakeTimers({ now: WINDOW_START })
    await countRequest(input)
    vi.setSystemTime(WINDOW_START.getTime() + PART_OF_A_SECOND_MS)
    await countRequest(input)
    await countRequest(input)
    vi.setSystemTime(WINDOW_START.getTime() + LATE_IN_THE_WINDOW_MS)

    expect(await countRequest(input)).toStrictEqual({ allowed: false, retryAfter: SECONDS_LEFT_LATE_IN_THE_WINDOW })
  })

  it("leaves a counter that refuses a request unwritten", async () => {
    for (let attempt = 0; attempt <= input.limit; attempt++) {
      await countRequest(input)
    }

    expect(await countersOf(input)).toStrictEqual([{ attempts: input.limit }])
  })
})

describe("limits counted in one batch", () => {
  const first = { key: "address:127.0.0.1", limit: 1, windowSeconds: 60 }
  const second = { key: "key:0f8a3c51", limit: 2, windowSeconds: 30 }
  const machine = { key: "machine:4c4c4544", limit: 3, windowSeconds: 120 }

  it("admits a request that every limit admits, with the seconds until the last of its counters resets", async () => {
    expect(await countAll([first, second, machine])).toStrictEqual({ allowed: true, retryAfter: machine.windowSeconds })
  })

  it("counts a request against the other limits only when the first limit admits it", async () => {
    await countAll([first, second])

    expect(await countAll([first, second])).toStrictEqual({ allowed: false, retryAfter: first.windowSeconds })
    expect(await countersOf(first)).toStrictEqual([{ attempts: first.limit }])
    expect(await countersOf(second)).toStrictEqual([{ attempts: 1 }])
  })

  it("answers with the first limit in order that refuses, once the first limit has counted the request", async () => {
    const loose = { ...first, limit: machine.limit }
    for (let attempt = 0; attempt < second.limit; attempt++) {
      await countAll([loose, second, machine])
    }

    expect(await countAll([loose, second, machine])).toStrictEqual({ allowed: false, retryAfter: second.windowSeconds })
    expect(await countersOf(loose)).toStrictEqual([{ attempts: second.limit + 1 }])
    expect(await countersOf(second)).toStrictEqual([{ attempts: second.limit }])
  })

  it("removes one bounded batch of expired counters per request, whatever the number of limits", async () => {
    vi.useFakeTimers({ now: WINDOW_START })
    await db.insert(rateLimit).values(
      Array.from({ length: EXPIRED_COUNTERS_PER_CLEANUP + LEFT_FOR_THE_NEXT_REQUEST }, (_, index) => ({
        attempts: 1,
        expiresAt: new Date(WINDOW_START.getTime() - PART_OF_A_SECOND_MS),
        key: `expired:${String(index)}`,
      })),
    )

    await countAll([first, second, machine])

    expect(await db.select().from(rateLimit).where(lte(rateLimit.expiresAt, WINDOW_START))).toHaveLength(LEFT_FOR_THE_NEXT_REQUEST)
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

  it("reports how many emails an address may still receive without counting the look", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-12T10:00:00.000Z") })
    expect(await recipientAllowance(recipient)).toStrictEqual({ allowed: true, retryAfter: 0 })

    for (let attempt = 0; attempt < RECIPIENT_EMAILS_PER_HOUR; attempt++) {
      expect(await recipientAllowance(recipient)).toStrictEqual({ allowed: true, retryAfter: 0 })
      await withinRecipientRateLimit(recipient)
    }
    vi.setSystemTime(Date.now() + HOUR_MS / 4)

    expect(await recipientAllowance({ ...recipient, recipient: " ada@example.test " })).toStrictEqual({ allowed: false, retryAfter: 2700 })
    vi.setSystemTime(Date.now() + HOUR_MS)
    expect(await recipientAllowance(recipient)).toStrictEqual({ allowed: true, retryAfter: 0 })
  })
})
