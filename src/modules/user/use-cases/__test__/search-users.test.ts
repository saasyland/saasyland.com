import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { SEARCH_HITS_LIMIT } from "~/src/modules/_core/utils/search"
import { searchUsersQuery } from "~/src/modules/user/use-cases/search-users"
import { user } from "~/src/modules/user/user.schema"

import { ROUTES } from "~/src/routes"

const ADMIN_ID = "01900000-0000-7000-8000-000000000061"
const ADA = { email: "ada.lovelace@example.test", id: "01900000-0000-7000-8000-000000000062", name: "Ada Lovelace" }
const GRACE = { email: "grace@navy.example.test", id: "01900000-0000-7000-8000-000000000063", name: "Grace Hopper" }
const MANY = Array.from({ length: SEARCH_HITS_LIMIT + 2 }, (_, index) => ({
  createdAt: new Date(Date.UTC(2026, 0, index + 1)),
  email: `member${String(index)}@crowd.example.test`,
  id: `01900000-0000-7000-8000-0000000001${String(index).padStart(2, "0")}`,
  name: `Member ${String(index)}`,
}))

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: ADMIN_ID }))
}

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values([ADA, GRACE, ...MANY])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("search-users", () => {
  it("finds users by any part of their name or email, ignoring case, and links each to its profile", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(searchUsersQuery({ text: "LOVE" }))).resolves.toStrictEqual([
      { detail: ADA.email, id: ADA.id, title: ADA.name, to: `${ROUTES.ADMIN.USERS.INDEX}/${ADA.id}` },
    ])
    await expect(executeQuery(searchUsersQuery({ text: "navy" }))).resolves.toStrictEqual([
      { detail: GRACE.email, id: GRACE.id, title: GRACE.name, to: `${ROUTES.ADMIN.USERS.INDEX}/${GRACE.id}` },
    ])
  })

  it("returns at most a handful of matches, the newest accounts first", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const hits = await executeQuery(searchUsersQuery({ text: "crowd" }))

    expect(hits.map(({ id }) => id)).toStrictEqual(
      MANY.toReversed()
        .slice(0, SEARCH_HITS_LIMIT)
        .map(({ id }) => id),
    )
  })

  it("waits for two letters before it searches", async () => {
    signInAs(ROLE_CODES.ADMIN)

    expect(searchUsersQuery({ text: " a " }).enabled).toBe(false)
    expect(searchUsersQuery({ text: "ad" }).enabled).toBe(true)
    await expect(executeQuery(searchUsersQuery({ text: "a" }))).rejects.toThrow()
  })

  it("refuses a caller who may not list users", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(searchUsersQuery({ text: "ada" }))).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})
