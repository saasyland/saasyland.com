import "@tanstack/react-start/server-only"

import type { BetterAuthOptions, BetterAuthRateLimitStorage } from "better-auth"
import { getIP } from "better-auth/api"
import { eq, inArray, lte, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

const SINGLE_REQUEST = 1
const MS_PER_SECOND = 1000
const CLEANUP_BATCH_SIZE = 100
const AUTH_KEY_PREFIX = "auth:"
const UNKNOWN_CLIENT = "unknown"
const NO_WAIT_SECONDS = 0

const IP_OPTIONS: BetterAuthOptions = { advanced: { ipAddress: { ipAddressHeaders: [IP_ADDRESS_HEADER] } } }

interface RateLimitInput {
  readonly key: string
  readonly limit: number
  readonly windowSeconds: number
}

interface RateLimitDecision {
  readonly allowed: boolean
  readonly retryAfter: number
}

export const clientAddress = (headers: Headers): string => getIP(headers, IP_OPTIONS) ?? UNKNOWN_CLIENT

export const consumeRateLimit = async ({ key, limit, windowSeconds }: RateLimitInput): Promise<RateLimitDecision> => {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + windowSeconds * MS_PER_SECOND)
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
    const secondsUntilReset = counters.map(({ resetsAt }) => Math.ceil((resetsAt.getTime() - now.getTime()) / MS_PER_SECOND))

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

export const authRateLimitStorage: BetterAuthRateLimitStorage = {
  consume: (key, { max, window }) => consumeRateLimit({ key: `${AUTH_KEY_PREFIX}${key}`, limit: max, windowSeconds: window }),
}
