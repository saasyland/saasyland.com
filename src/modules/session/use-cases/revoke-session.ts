import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { SESSION_MUTATION_KEYS } from "~/src/modules/session/session.constants"
import { session } from "~/src/modules/session/session.schema"
import type { Session } from "~/src/modules/session/session.types"
import { sessionZodSchemas } from "~/src/modules/session/session.zod"

const SINGLE_ROW = 1

export const revokeSession = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: Session["revokeSession"]) => sessionZodSchemas.revokeSession.parse(input))
  .handler(async ({ context, data }) => {
    const [row] = await db
      .select({ token: session.token })
      .from(session)
      .where(and(eq(session.id, data.sessionId), eq(session.userId, context.auth.user.id)))
      .limit(SINGLE_ROW)
    if (row === undefined) {
      return { status: true }
    }
    return auth.api.revokeSession({ body: { token: row.token }, headers: context.requestHeaders })
  })

export const revokeSessionMutation = mutationOptions({
  mutationFn: (data: Session["revokeSession"]) => revokeSession({ data }),
  mutationKey: SESSION_MUTATION_KEYS.REVOKE,
})
