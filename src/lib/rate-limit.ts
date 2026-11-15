import "@tanstack/react-start/server-only"

import { eq, inArray, lte, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

import { MILLISECONDS_PER_SECOND, SECONDS_PER_HOUR } from "~/src/lib/duration"
import { sha256Hex } from "~/src/lib/hex"

const SINGLE_REQUEST = 1
const CLEANUP_BATCH_SIZE = 100
const RECIPIENT_KEY_PREFIX = "recipient:"
const NO_WAIT_SECONDS = 0

interface RateLimitInput {
  readonly key: string
  readonly limit: number
  readonly windowSeconds: number
}

interface RateLimitDecision {
  readonly allowed: boolean
  readonly retryAfter: number
}

export const consumeRateLimit = async ({ key, limit, windowSeconds }: RateLimitInput): Promise<RateLimitDecision> => {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + windowSeconds * MILLISECONDS_PER_SECOND)
    const expired = db.select({ key: rateLimit.key }).from(rateLimit).where(lte(rateLimit.expiresAt, now)).limit(CLEANUP_BATCH_SIZE)
    const [, admitted, counters] = await db.batch([
      db.delete(rateLimit).where(inArray(rateLimit.key, expired)),
      db
        .insert(rateLimit)
        .values({ attempts: SINGLE_REQUEST, expiresAt, key })
        .onConflictDoUpdate({
          set: {
            attempts: sql`case when ${rateLimit.expiresAt} <= ${now.getTime()} then 1 else ${rateLimit.attempts} + 1 end`,
            expiresAt: sql`case when ${rateLimit.expiresAt} <= ${now.getTime()} then ${expiresAt.getTime()} else ${rateLimit.expiresAt} end`,
          },
          setWhere: sql`${rateLimit.expiresAt} <= ${now.getTime()} or ${rateLimit.attempts} < ${limit}`,
          target: rateLimit.key,
        })
        .returning({ key: rateLimit.key }),
      db.select({ resetsAt: rateLimit.expiresAt }).from(rateLimit).where(eq(rateLimit.key, key)),
    ])
    const secondsUntilReset = counters.map(({ resetsAt }) => Math.ceil((resetsAt.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND))

    return { allowed: admitted.length === SINGLE_REQUEST, retryAfter: Math.max(NO_WAIT_SECONDS, ...secondsUntilReset) }
  } catch (error) {
    console.error("Rate-limit storage unavailable", error)
    return { allowed: false, retryAfter: windowSeconds }
  }
}

export const withinRateLimit = async (input: RateLimitInput): Promise<boolean> => {
  const { allowed } = await consumeRateLimit(input)
  return allowed
}

export const withinRecipientRateLimit = async ({ kind, recipient }: Readonly<{ kind: string; recipient: string }>): Promise<boolean> =>
  withinRateLimit({
    key: `${RECIPIENT_KEY_PREFIX}${kind}:${await sha256Hex(recipient.trim().toLowerCase())}`,
    limit: RECIPIENT_EMAILS_PER_HOUR,
    windowSeconds: SECONDS_PER_HOUR,
  })
