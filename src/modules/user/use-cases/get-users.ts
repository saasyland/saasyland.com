import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, count, desc, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { USER_QUERY_KEYS, USER_STATUS } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

const sortColumns = {
  createdAt: user.createdAt,
  emailVerified: user.emailVerified,
  role: user.role,
  status: sql`case when ${user.banned} then ${USER_STATUS.BANNED} when ${user.emailVerified} then ${USER_STATUS.ACTIVE} else ${USER_STATUS.PENDING} end`,
  timezone: user.timezone,
  twoFactorEnabled: user.twoFactorEnabled,
  updatedAt: user.updatedAt,
  user: user.name,
}

export const getUsers = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .validator((input: User["getUsers"]) => userZodSchemas.getUsers.parse(input))
  .handler(async ({ data }) => {
    const [rows, totals] = await db.batch([
      db
        .select()
        .from(user)
        .orderBy(...data.sorting.map((sort) => (sort.desc ? desc : asc)(sortColumns[sort.id])), desc(user.createdAt), desc(user.id))
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db
        .select({
          pendingVerification: sql<number>`coalesce(sum(case when ${user.emailVerified} = 0 and ${user.banned} = 0 then 1 else 0 end), 0)`,
          total: count(),
        })
        .from(user),
    ])
    return {
      pendingVerification: totals.reduce((sum, row) => sum + row.pendingVerification, 0),
      rows,
      total: totals.reduce((sum, row) => sum + row.total, 0),
    }
  })

export const getUsersPageQuery = (input: User["getUsers"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getUsers>>>({
    queryFn: () => getUsers({ data: input }),
    queryKey: [...USER_QUERY_KEYS.LIST, userZodSchemas.getUsers.parse(input)],
  })

export const getUsersQuery = getUsersPageQuery()
