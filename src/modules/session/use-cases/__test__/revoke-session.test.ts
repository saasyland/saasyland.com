import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { session } from "~/src/modules/session/session.schema"
import { revokeSessionMutation } from "~/src/modules/session/use-cases/revoke-session"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "01900000-0000-7000-8000-000000000001"
const OTHER_USER_ID = "01900000-0000-7000-8000-000000000002"
const EXPIRES_AT = new Date(Date.now() + 86_400_000)
let request = new Request("http://127.0.0.1:3000/")

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values([
    { email: "revoke-own@example.test", id: USER_ID, name: "Owner" },
    { email: "revoke-other@example.test", id: OTHER_USER_ID, name: "Other" },
  ])
  await db.insert(session).values([
    { expiresAt: EXPIRES_AT, id: "own-session", token: "own-token", userId: USER_ID },
    { expiresAt: EXPIRES_AT, id: "foreign-session", token: "foreign-token", userId: OTHER_USER_ID },
  ])
  request = new Request("http://127.0.0.1:3000/")
  vi.mocked(getRequest).mockReturnValue(request)
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ userId: USER_ID }))
})
afterEach(() => vi.restoreAllMocks())

describe("revoke-session", () => {
  it("revokes the caller's session by id, resolving its token on the server", async () => {
    const revokeSession = vi.spyOn(auth.api, "revokeSession").mockResolvedValue({ status: true })

    await expect(executeMutation(revokeSessionMutation, { sessionId: "own-session" })).resolves.toStrictEqual({ status: true })
    expect(revokeSession).toHaveBeenCalledExactlyOnceWith({ body: { token: "own-token" }, headers: request.headers })
  })

  it.each(["foreign-session", "missing-session"])("treats %s as already revoked without touching it", async (sessionId) => {
    const revokeSession = vi.spyOn(auth.api, "revokeSession")

    await expect(executeMutation(revokeSessionMutation, { sessionId })).resolves.toStrictEqual({ status: true })
    expect(revokeSession).not.toHaveBeenCalled()
    expect(await db.select().from(session).where(eq(session.id, "foreign-session"))).toHaveLength(1)
  })

  it("rejects an empty session id", async () => {
    await expect(executeMutation(revokeSessionMutation, { sessionId: "" })).rejects.toMatchObject({ code: "VALIDATION" })
  })

  it("returns a domain error when the caller is signed out", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeMutation(revokeSessionMutation, { sessionId: "own-session" })).rejects.toThrow("UNAUTHORIZED")
  })
})
