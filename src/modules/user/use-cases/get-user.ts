import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const getUser = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["get"] })])
  .validator((input: User["getUser"]) => userZodSchemas.getUser.parse(input))
  .handler(async ({ data: { userId } }) => {
    const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })

export const getUserQuery = (input: User["getUser"]) =>
  queryOptions({
    queryFn: () => getUser({ data: input }),
    queryKey: [...USER_QUERY_KEYS.DETAIL, input],
  })
