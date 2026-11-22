import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { WITHDRAWAL_QUERY_KEYS } from "~/src/modules/withdrawal/withdrawal.constants"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"
import { withdrawalZodSchemas } from "~/src/modules/withdrawal/withdrawal.zod"

export const getUserWithdrawals = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["get"] })])
  .validator((input: Withdrawal["getUserWithdrawals"]) => withdrawalZodSchemas.getUserWithdrawals.parse(input))
  .handler(async ({ data: { userId } }) => {
    const rows = await db
      .select({
        acknowledgedAt: withdrawal.acknowledgedAt,
        channel: withdrawal.channel,
        createdAt: withdrawal.createdAt,
        eligibility: withdrawal.eligibility,
        email: withdrawal.email,
        id: withdrawal.id,
        name: withdrawal.name,
        reference: withdrawal.reference,
      })
      .from(withdrawal)
      .where(eq(withdrawal.userId, userId))
      .orderBy(desc(withdrawal.createdAt), desc(withdrawal.id))

    return { rows }
  })

export const userWithdrawalsQuery = (input: Withdrawal["getUserWithdrawals"]) =>
  queryOptions({
    queryFn: () => getUserWithdrawals({ data: input }),
    queryKey: [...WITHDRAWAL_QUERY_KEYS.USER, input],
  })
