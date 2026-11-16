import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { SESSION_MUTATION_KEYS } from "~/src/modules/session/session.constants"
import { session } from "~/src/modules/session/session.schema"
import type { Session } from "~/src/modules/session/session.types"
import { sessionZodSchemas } from "~/src/modules/session/session.zod"

const SINGLE_ROW = 1

export const revokeUserSession = createServerFn({ method: "POST" })
  .middleware([authorized({ session: ["revoke"] })])
  .validator((input: Session["revokeUserSession"]) => sessionZodSchemas.revokeUserSession.parse(input))
  .handler(async ({ context, data }) => {
    const [row] = await db.select({ token: session.token }).from(session).where(eq(session.id, data.sessionId)).limit(SINGLE_ROW)
    if (row === undefined) {
      return { success: true }
    }
    return auth.api.revokeUserSession({ body: { sessionToken: row.token }, headers: context.requestHeaders })
  })

export const revokeUserSessionMutation = mutationOptions({
  mutationFn: (data: Session["revokeUserSession"]) => revokeUserSession({ data }),
  mutationKey: SESSION_MUTATION_KEYS.REVOKE_USER,
})
