import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { MIN_FIELD_LENGTH, idField } from "~/src/modules/_core/utils/zod-fields"
import { session } from "~/src/modules/session/session.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({ zodInstance: zod })

const tokenField = zod.string().min(MIN_FIELD_LENGTH, { message: "tokenRequired" })

const userIdInput = zod.object({
  userId: idField,
})

const listUserSessions = userIdInput

const revokeSession = zod.object({
  sessionId: idField,
})

const revokeUserSession = zod.object({
  sessionToken: tokenField,
})

const revokeUserSessions = userIdInput

const insert = createInsertSchema(session)
const select = createSelectSchema(session)
const update = createUpdateSchema(session)

export const sessionZodSchemas = {
  insert,
  listUserSessions,
  revokeSession,
  revokeUserSession,
  revokeUserSessions,
  select,
  update,
}
