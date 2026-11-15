import zod from "zod/v4"

import { MIN_FIELD_LENGTH, idField } from "~/src/modules/_core/utils/zod-fields"

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

export const sessionZodSchemas = {
  listUserSessions,
  revokeSession,
  revokeUserSession,
  revokeUserSessions,
}
