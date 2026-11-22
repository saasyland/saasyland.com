import type * as StartServerModule from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import type { auth } from "~/src/integrations/better-auth/auth.server"
import * as authServer from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { FLAG_FILTER } from "~/src/modules/_core/utils/pagination"
import { getUsersPageQuery, getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import { USER_STATUS } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
import type { User } from "~/src/modules/user/user.types"
import { getUserStatus } from "~/src/modules/user/user.utils"

const HEADERS = new Headers()
const USER_ID = "01900000-0000-7000-8000-000000000001"

type AuthApi = typeof auth.api

const getSessionMock = vi.hoisted(() => vi.fn<AuthApi["getSession"]>())

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

const idsOf = async (input: User["getUsers"]): Promise<string[]> => {
  const { rows } = await executeQuery(getUsersPageQuery(input))
  return rows.map(({ id }) => id)
}

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values(
    Array.from({ length: 12 }, (_, index) => ({
      createdAt: new Date("2026-09-24T12:00:00Z"),
      email: `member${index}@example.test`,
      emailVerified: index % 2 === 0,
      id: `row-${String(index).padStart(2, "0")}`,
      name: `Member ${String(index).padStart(2, "0")}`,
    })),
  )
  vi.spyOn(authServer.auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: USER_ID }))
})
afterEach(() => vi.restoreAllMocks())

describe("list-users", () => {
  it("lists users for admins", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: USER_ID }))

    const result = await executeQuery(getUsersQuery)
    expect(result.rows.map((row) => row.id)).toEqual([
      "row-11",
      "row-10",
      "row-09",
      "row-08",
      "row-07",
      "row-06",
      "row-05",
      "row-04",
      "row-03",
      "row-02",
    ])
    expect(result.total).toBe(12)

    expect(getSessionMock).toHaveBeenCalledTimes(1)
  })

  it("rejects when the caller is not an admin", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: USER_ID }))

    await expect(executeQuery(getUsersQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects when the caller is signed out", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeQuery(getUsersQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })

  it("returns the remaining page and keeps the database total", async () => {
    const result = await executeQuery(getUsersPageQuery({ pageIndex: 1 }))
    expect(result.rows.map((row) => row.id)).toEqual(["row-01", "row-00"])
    expect(result.total).toBe(12)
  })

  it("returns an empty page for an empty table", async () => {
    await db.delete(user)
    const result = await executeQuery(getUsersQuery)
    expect(result).toMatchObject({ rows: [], total: 0 })
  })

  it.each([false, true])("sorts across pages, not just within the current page (descending: %s)", async (desc) => {
    const result = await executeQuery(getUsersPageQuery({ pageIndex: 1, pageSize: 2, sorting: [{ desc, id: "user" }] }))
    expect(result.rows.map((row) => row.name)).toEqual(desc ? ["Member 09", "Member 08"] : ["Member 02", "Member 03"])
    expect(result.pendingVerification).toBe(6)
  })

  it("sorts by the status the table shows, from active through banned to pending", async () => {
    await db.update(user).set({ banned: true }).where(eq(user.id, "row-11"))

    const result = await executeQuery(getUsersPageQuery({ pageSize: 12, sorting: [{ desc: false, id: "status" }] }))

    expect(result.rows.map(getUserStatus)).toEqual([
      ...Array.from({ length: 6 }, () => USER_STATUS.ACTIVE),
      USER_STATUS.BANNED,
      ...Array.from({ length: 5 }, () => USER_STATUS.PENDING),
    ])
  })

  it("searches names and emails and filters by every column the grid offers", async () => {
    await db
      .update(user)
      .set({ banned: true, role: ROLE_CODES.ADMIN, timezone: "Europe/Warsaw", twoFactorEnabled: true })
      .where(eq(user.id, "row-11"))
    await db
      .update(user)
      .set({ createdAt: new Date("2026-11-01T12:00:00Z"), updatedAt: new Date("2026-11-02T12:00:00Z") })
      .where(eq(user.id, "row-03"))
    const november = new Date("2026-10-31T00:00:00Z").getTime()

    await expect(idsOf({ search: "member 1" })).resolves.toStrictEqual(["row-11", "row-10"])
    await expect(idsOf({ filters: { user: "member0@" } })).resolves.toStrictEqual(["row-00"])
    await expect(idsOf({ filters: { role: [ROLE_CODES.ADMIN] } })).resolves.toStrictEqual(["row-11"])
    await expect(idsOf({ filters: { status: [USER_STATUS.BANNED] } })).resolves.toStrictEqual(["row-11"])
    await expect(idsOf({ filters: { status: [USER_STATUS.PENDING] } })).resolves.toStrictEqual([
      "row-03",
      "row-09",
      "row-07",
      "row-05",
      "row-01",
    ])
    await expect(idsOf({ filters: { emailVerified: FLAG_FILTER.YES, user: "member1" } })).resolves.toStrictEqual(["row-10"])
    await expect(idsOf({ filters: { twoFactorEnabled: FLAG_FILTER.YES } })).resolves.toStrictEqual(["row-11"])
    await expect(idsOf({ filters: { timezone: ["Europe/Warsaw"] } })).resolves.toStrictEqual(["row-11"])
    await expect(idsOf({ filters: { createdAt: { from: november } } })).resolves.toStrictEqual(["row-03"])
    await expect(
      idsOf({ filters: { updatedAt: { from: november, to: new Date("2026-11-03T00:00:00Z").getTime() } } }),
    ).resolves.toStrictEqual(["row-03"])

    const filtered = await executeQuery(getUsersPageQuery({ filters: { emailVerified: FLAG_FILTER.NO } }))

    expect(filtered.total).toBe(6)
    expect(filtered.pendingVerification).toBe(5)
  })

  it("rejects unsupported sort columns from table state", () => {
    expect(() => getUsersPageQuery({ sorting: [{ desc: false, id: "password" }] })).toThrow()
  })
})
