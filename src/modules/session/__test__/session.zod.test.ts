import { describe, expect, it } from "vite-plus/test"

import { sessionZodSchemas } from "~/src/modules/session/session.zod"

const USER_ID = "00000000-0000-7000-8000-000000000001"

describe("session zod schemas", () => {
  it("rejects incomplete insert payloads", () => {
    expect.hasAssertions()
    expect(sessionZodSchemas.insert.safeParse({ userId: USER_ID }).success).toBe(false)
  })
  it("revokes a session by id and never accepts a token", () => {
    expect(sessionZodSchemas.revokeSession.safeParse({ sessionId: "01900000-0000-7000-8000-000000000002" }).success).toBe(true)
    expect(sessionZodSchemas.revokeSession.safeParse({ sessionId: "" }).success).toBe(false)
    expect(sessionZodSchemas.revokeSession.safeParse({ token: "session-token" }).success).toBe(false)
  })
})
