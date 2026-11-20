import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { count, gte } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { bucketOf } from "~/src/integrations/drizzle-orm/drizzle.time-series"

import { pointsOf, timeSeries } from "~/src/modules/_core/utils/time-series"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const getUserSignups = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .validator((input: User["getUserSignups"]) => userZodSchemas.getUserSignups.parse(input))
  .handler(async ({ data }) => {
    const series = timeSeries(data.range, new Date())
    const bucket = bucketOf(user.createdAt, series.bucket)
    const rows = await db.select({ bucket, signups: count() }).from(user).where(gte(user.createdAt, series.since)).groupBy(bucket)
    const points = pointsOf(series, new Map(rows.map((row) => [row.bucket, row.signups])))

    return { bucket: series.bucket, points, total: points.reduce((total, { value }) => total + value, 0) }
  })

export const userSignupsQuery = (input: User["getUserSignups"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getUserSignups>>>({
    queryFn: () => getUserSignups({ data: input }),
    queryKey: [...USER_QUERY_KEYS.SIGNUPS, userZodSchemas.getUserSignups.parse(input)],
  })
