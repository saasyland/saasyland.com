import * as zod from "zod"

import { idField } from "~/src/modules/_core/utils/zod-fields"

const userIdInput = zod.object({
  userId: idField,
})

const listUserSessions = userIdInput

const revokeSession = zod.object({
  sessionId: idField,
})

const revokeUserSession = zod.object({
  sessionId: idField,
})

const revokeUserSessions = userIdInput

export const sessionZodSchemas = {
  listUserSessions,
  revokeSession,
  revokeUserSession,
  revokeUserSessions,
}
