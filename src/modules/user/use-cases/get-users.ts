import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, count, desc, sql } from "drizzle-orm"
import zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { paginationSchema } from "~/src/modules/_core/utils/pagination"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"

const MAX_SORT_COLUMNS = 8
const sortColumns = {
  createdAt: user.createdAt,
  emailVerified: user.emailVerified,
  role: user.role,
  status: sql`case when ${user.banned} then 'banned' when ${user.emailVerified} then 'active' else 'pending' end`,
  timezone: user.timezone,
  twoFactorEnabled: user.twoFactorEnabled,
  updatedAt: user.updatedAt,
  user: user.name,
}

const userSortSchema = zod.object({
  desc: zod.boolean(),
  id: zod.string().pipe(zod.enum(["user", "role", "status", "emailVerified", "twoFactorEnabled", "timezone", "createdAt", "updatedAt"])),
})
export const listUsersSchema = paginationSchema.extend({ sorting: zod.array(userSortSchema).max(MAX_SORT_COLUMNS).default([]) })

export const getUsers = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .validator((input: zod.input<typeof listUsersSchema>) => listUsersSchema.parse(input))
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

export const getUsersPageQuery = (input: zod.input<typeof listUsersSchema> = {}) =>
  queryOptions<Awaited<ReturnType<typeof getUsers>>>({
    queryFn: () => getUsers({ data: input }),
    queryKey: [...USER_QUERY_KEYS.LIST, listUsersSchema.parse(input)],
  })

export const getUsersQuery = getUsersPageQuery()
