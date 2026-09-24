import "@tanstack/react-start/server-only"

import { inArray, lte, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

const SINGLE_REQUEST = 1
const MS_PER_SECOND = 1000
const CLEANUP_BATCH_SIZE = 100

export const withinRateLimit = async ({
  key,
  limit,
  windowSeconds,
}: {
  key: string
  limit: number
  windowSeconds: number
}): Promise<boolean> => {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + windowSeconds * MS_PER_SECOND)
    const expired = db.select({ key: rateLimit.key }).from(rateLimit).where(lte(rateLimit.expiresAt, now)).limit(CLEANUP_BATCH_SIZE)
    const [, admitted] = await db.batch([
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
    ])

    return admitted.length === SINGLE_REQUEST
  } catch (error) {
    console.error("Rate-limit storage unavailable", error)
    return false
  }
}
