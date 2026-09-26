import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { session } from "~/src/modules/session/session.schema"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "01900000-0000-7000-8000-000000000001"
const OTHER_USER_ID = "01900000-0000-7000-8000-000000000002"
const DAY_MS = 86_400_000
const NOW = Date.now()

const createSessionRow = (id: string, overrides: Partial<typeof session.$inferInsert> = {}): typeof session.$inferInsert => ({
  createdAt: new Date(NOW - DAY_MS),
  expiresAt: new Date(NOW + DAY_MS),
  id,
  token: `${id}-token`,
  updatedAt: new Date(NOW - DAY_MS),
  userId: USER_ID,
  ...overrides,
})

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values([
    { email: "sessions@example.test", id: USER_ID, name: "Owner" },
    { email: "other-sessions@example.test", id: OTHER_USER_ID, name: "Other" },
  ])
})
afterEach(() => vi.restoreAllMocks())

describe("get-active-sessions", () => {
  it("lists the caller's live sessions newest first, including sign-ins older than a day, without tokens", async () => {
    const signedInLongAgo = createSessionRow("long-ago", {
      createdAt: new Date(NOW - 3 * DAY_MS),
      ipAddress: "192.0.2.1",
      userAgent: "Firefox",
    })
    await db
      .insert(session)
      .values([
        signedInLongAgo,
        createSessionRow("recent", { createdAt: new Date(NOW - 60_000) }),
        createSessionRow("expired", { expiresAt: new Date(NOW - 1000) }),
        createSessionRow("impersonated", { impersonatedBy: OTHER_USER_ID }),
        createSessionRow("someone-else", { userId: OTHER_USER_ID }),
      ])
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ userId: USER_ID }))

    const sessions = await executeQuery(getActiveSessionsQuery)

    expect(sessions.map(({ id }) => id)).toEqual(["recent", "long-ago"])
    expect(sessions[1]).toStrictEqual({
      createdAt: signedInLongAgo.createdAt,
      expiresAt: signedInLongAgo.expiresAt,
      id: "long-ago",
      ipAddress: "192.0.2.1",
      updatedAt: signedInLongAgo.updatedAt,
      userAgent: "Firefox",
    })
  })

  it("rejects when the caller is signed out", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(null)

    await expect(executeQuery(getActiveSessionsQuery)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})
