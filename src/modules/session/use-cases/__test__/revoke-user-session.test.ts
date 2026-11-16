import { getRequest } from "@tanstack/react-start/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { session } from "~/src/modules/session/session.schema"
import { revokeUserSessionMutation } from "~/src/modules/session/use-cases/revoke-user-session"
import { user } from "~/src/modules/user/user.schema"

const ADMIN_USER_ID = "01900000-0000-7000-8000-000000000001"
const TARGET_USER_ID = "01900000-0000-7000-8000-000000000002"
const EXPIRES_AT = new Date(Date.now() + 86_400_000)
let request = new Request("http://127.0.0.1:3000/")

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values([
    { email: "revoke-admin@example.test", id: ADMIN_USER_ID, name: "Admin", role: ROLE_CODES.ADMIN },
    { email: "revoke-target@example.test", id: TARGET_USER_ID, name: "Target" },
  ])
  await db.insert(session).values({ expiresAt: EXPIRES_AT, id: "target-session", token: "target-token", userId: TARGET_USER_ID })
  request = new Request("http://127.0.0.1:3000/")
  vi.mocked(getRequest).mockReturnValue(request)
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_USER_ID }))
})
afterEach(() => vi.restoreAllMocks())

describe("revoke-user-session", () => {
  it("revokes another user's session by id, resolving its token on the server", async () => {
    const revokeUserSession = vi.spyOn(auth.api, "revokeUserSession").mockResolvedValue({ success: true })

    await expect(executeMutation(revokeUserSessionMutation, { sessionId: "target-session" })).resolves.toStrictEqual({ success: true })
    expect(revokeUserSession).toHaveBeenCalledExactlyOnceWith({ body: { sessionToken: "target-token" }, headers: request.headers })
  })

  it("treats a session that no longer exists as already revoked", async () => {
    const revokeUserSession = vi.spyOn(auth.api, "revokeUserSession")

    await expect(executeMutation(revokeUserSessionMutation, { sessionId: "missing-session" })).resolves.toStrictEqual({ success: true })
    expect(revokeUserSession).not.toHaveBeenCalled()
  })

  it("rejects an empty session id", async () => {
    await expect(executeMutation(revokeUserSessionMutation, { sessionId: "" })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
  })

  it("returns a domain error when the caller may not revoke sessions", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: TARGET_USER_ID }))
    const revokeUserSession = vi.spyOn(auth.api, "revokeUserSession")

    await expect(executeMutation(revokeUserSessionMutation, { sessionId: "target-session" })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
    expect(revokeUserSession).not.toHaveBeenCalled()
  })
})
