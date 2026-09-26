import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, gt, isNull } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { session } from "~/src/modules/session/session.schema"

export const getActiveSessions = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(({ context }) => {
    const now = new Date()
    return db
      .select({
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        id: session.id,
        ipAddress: session.ipAddress,
        updatedAt: session.updatedAt,
        userAgent: session.userAgent,
      })
      .from(session)
      .where(and(eq(session.userId, context.auth.user.id), gt(session.expiresAt, now), isNull(session.impersonatedBy)))
      .orderBy(desc(session.createdAt))
  })

export const getActiveSessionsQuery = queryOptions({ queryFn: () => getActiveSessions(), queryKey: SESSION_QUERY_KEYS.ACTIVE })
