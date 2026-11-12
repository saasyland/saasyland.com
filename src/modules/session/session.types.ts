import type * as zod from "zod"

import type { session } from "~/src/modules/session/session.schema"
import type { sessionZodSchemas } from "~/src/modules/session/session.zod"

export interface Session {
  select: typeof session.$inferSelect
  insert: typeof session.$inferInsert
  listUserSessions: zod.input<typeof sessionZodSchemas.listUserSessions>
  revokeSession: zod.input<typeof sessionZodSchemas.revokeSession>
  revokeUserSession: zod.input<typeof sessionZodSchemas.revokeUserSession>
  revokeUserSessions: zod.input<typeof sessionZodSchemas.revokeUserSessions>
}
