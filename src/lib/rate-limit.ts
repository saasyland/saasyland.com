import "@tanstack/react-start/server-only"

import { type SQL, and, count, eq, gt, gte, inArray, lte, not, or, sql } from "drizzle-orm"
import type { BatchResponse } from "drizzle-orm/batch"
import type { SQLiteInsertBase } from "drizzle-orm/sqlite-core"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { EXPIRED_COUNTERS_PER_CLEANUP, RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

import { MILLISECONDS_PER_SECOND, SECONDS_PER_HOUR } from "~/src/lib/duration"
import { sha256Hex } from "~/src/lib/hex"

const FIRST_LIMIT = "first_limit"
const REFUSALS = "refusals"
const RECIPIENT_KEY_PREFIX = "recipient:"
const SINGLE_ROW = 1

export interface RateLimitInput {
  readonly key: string
  readonly limit: number
  readonly windowSeconds: number
}

export interface RateLimitDecision {
  readonly allowed: boolean
  readonly retryAfter: number
}

interface CounterReset {
  readonly resetsAt: Date
}

type CounterInsert = SQLiteInsertBase<typeof rateLimit, "async", D1Result>

const refuses = ({ key, limit }: RateLimitInput, now: Date): SQL =>
  sql`(${eq(rateLimit.key, key)} and ${gt(rateLimit.expiresAt, now)} and ${gte(rateLimit.attempts, limit)})`

const windowEnd = ({ windowSeconds }: RateLimitInput, now: Date): Date => new Date(now.getTime() + windowSeconds * MILLISECONDS_PER_SECOND)

const secondsUntil = ({ resetsAt }: CounterReset, now: Date): number =>
  Math.ceil((resetsAt.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND)

const upsertCounter = (insert: CounterInsert, input: RateLimitInput, now: Date) => {
  const expired = lte(rateLimit.expiresAt, now)

  return insert
    .onConflictDoUpdate({
      set: {
        attempts: sql`case when ${expired} then 1 else ${rateLimit.attempts} + 1 end`,
        expiresAt: sql`case when ${expired} then ${windowEnd(input, now).getTime()} else ${rateLimit.expiresAt} end`,
      },
      setWhere: not(refuses(input, now)),
      target: rateLimit.key,
    })
    .returning({ resetsAt: rateLimit.expiresAt })
}

const countFirst = (input: RateLimitInput, now: Date) =>
  upsertCounter(db.insert(rateLimit).values({ attempts: 1, expiresAt: windowEnd(input, now), key: input.key }), input, now)

const countUnlessRefusedBy = (first: RateLimitInput, input: RateLimitInput, now: Date) => {
  const firstLimit = db
    .select({ refusals: count().as(REFUSALS) })
    .from(rateLimit)
    .where(refuses(first, now))
    .as(FIRST_LIMIT)
  const freshCounter = db
    .select({
      attempts: sql`1`.as(rateLimit.attempts.name),
      expiresAt: sql`${windowEnd(input, now).getTime()}`.as(rateLimit.expiresAt.name),
      key: sql`${input.key}`.as(rateLimit.key.name),
    })
    .from(firstLimit)
    .where(eq(firstLimit.refusals, 0))

  return upsertCounter(db.insert(rateLimit).select(freshCounter), input, now)
}

export const rateLimitBatch = (limits: readonly [RateLimitInput, ...RateLimitInput[]]) => {
  const [first, ...rest] = limits
  const now = new Date()
  const refusals = db
    .select({ key: rateLimit.key, resetsAt: rateLimit.expiresAt })
    .from(rateLimit)
    .where(or(...limits.map((input) => refuses(input, now))))
  const expired = db.select({ key: rateLimit.key }).from(rateLimit).where(lte(rateLimit.expiresAt, now)).limit(EXPIRED_COUNTERS_PER_CLEANUP)
  const cleanup = db.delete(rateLimit).where(inArray(rateLimit.key, expired))
  const statements: readonly [typeof refusals, typeof cleanup, ...ReturnType<typeof upsertCounter>[]] = [
    refusals,
    cleanup,
    ...rest.map((input) => countUnlessRefusedBy(first, input, now)),
    countFirst(first, now),
  ]

  return {
    decision: ([refused, , ...counted]: BatchResponse<typeof statements>): RateLimitDecision => {
      const [refusal] = limits.flatMap(({ key }) => refused.filter((row) => row.key === key))

      if (refusal === undefined) {
        return { allowed: true, retryAfter: Math.max(0, ...counted.flat().map((reset) => secondsUntil(reset, now))) }
      }

      return { allowed: false, retryAfter: secondsUntil(refusal, now) }
    },
    statements,
  }
}

export const countRequest = async (input: RateLimitInput): Promise<RateLimitDecision> => {
  const { decision, statements } = rateLimitBatch([input])

  return decision(await db.batch(statements))
}

export const consumeRateLimit = async (input: RateLimitInput): Promise<RateLimitDecision> => {
  try {
    return await countRequest(input)
  } catch (error) {
    console.error("Rate-limit storage unavailable", error)
    return { allowed: false, retryAfter: input.windowSeconds }
  }
}

export const withinRateLimit = async (input: RateLimitInput): Promise<boolean> => {
  const { allowed } = await consumeRateLimit(input)
  return allowed
}

interface Recipient {
  readonly kind: string
  readonly recipient: string
}

const recipientKey = async ({ kind, recipient }: Recipient): Promise<string> =>
  `${RECIPIENT_KEY_PREFIX}${kind}:${await sha256Hex(recipient.trim().toLowerCase())}`

export const withinRecipientRateLimit = async (recipient: Recipient): Promise<boolean> =>
  withinRateLimit({ key: await recipientKey(recipient), limit: RECIPIENT_EMAILS_PER_HOUR, windowSeconds: SECONDS_PER_HOUR })

export const recipientAllowance = async (recipient: Recipient): Promise<RateLimitDecision> => {
  const now = new Date()
  const key = await recipientKey(recipient)
  const [counter] = await db
    .select({ attempts: rateLimit.attempts, resetsAt: rateLimit.expiresAt })
    .from(rateLimit)
    .where(and(eq(rateLimit.key, key), gt(rateLimit.expiresAt, now)))
    .limit(SINGLE_ROW)

  if (counter === undefined || counter.attempts < RECIPIENT_EMAILS_PER_HOUR) {
    return { allowed: true, retryAfter: 0 }
  }

  return { allowed: false, retryAfter: secondsUntil(counter, now) }
}
