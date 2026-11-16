import { describe, expect, it } from "vite-plus/test"

import { sessionZodSchemas } from "~/src/modules/session/session.zod"

describe("session zod schemas", () => {
  it("revokes a session by id and never accepts a token", () => {
    expect(sessionZodSchemas.revokeSession.safeParse({ sessionId: "01900000-0000-7000-8000-000000000002" }).success).toBe(true)
    expect(sessionZodSchemas.revokeSession.safeParse({ sessionId: "" }).success).toBe(false)
    expect(sessionZodSchemas.revokeSession.safeParse({ token: "session-token" }).success).toBe(false)
  })
  it("revokes another user's session by id and never accepts a token", () => {
    expect(sessionZodSchemas.revokeUserSession.safeParse({ sessionId: "01900000-0000-7000-8000-000000000002" }).success).toBe(true)
    expect(sessionZodSchemas.revokeUserSession.safeParse({ sessionToken: "session-token" }).success).toBe(false)
  })
})
