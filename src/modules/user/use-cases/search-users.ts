import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { desc, or } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { containsText } from "~/src/integrations/drizzle-orm/drizzle.search"

import { SEARCH_HITS_LIMIT, SEARCH_STALE_MS, type SearchHit } from "~/src/modules/_core/utils/search"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import * as ROUTES from "~/src/routes"

export const searchUsers = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .validator((input: User["searchUsers"]) => userZodSchemas.searchUsers.parse(input))
  .handler(async ({ data }): Promise<readonly SearchHit[]> => {
    const rows = await db
      .select({ email: user.email, id: user.id, name: user.name })
      .from(user)
      .where(or(containsText(user.name, data.text), containsText(user.email, data.text)))
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(SEARCH_HITS_LIMIT)
    return rows.map(({ email, id, name }) => ({ detail: email, id, title: name, to: `${ROUTES.ADMIN_USERS}/${id}` }))
  })

export const searchUsersQuery = (input: User["searchUsers"]) =>
  queryOptions({
    enabled: userZodSchemas.searchUsers.safeParse(input).success,
    placeholderData: keepPreviousData,
    queryFn: () => searchUsers({ data: input }),
    queryKey: [...USER_QUERY_KEYS.SEARCH, input.text],
    staleTime: SEARCH_STALE_MS,
  })
