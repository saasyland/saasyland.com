import type * as StartServerModule from "@tanstack/react-start/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import type { auth } from "~/src/integrations/better-auth/auth.server"
import * as authServer from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { category } from "~/src/modules/category/category.schema"
import { getCategoriesPageQuery, getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"

const HEADERS = new Headers()
const SINGLE_CALL = 1
const USER_ID = "01900000-0000-7000-8000-000000000001"

type AuthApi = typeof auth.api

const getSessionMock = vi.hoisted(() => vi.fn<AuthApi["getSession"]>())

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

beforeEach(async () => {
  await db.delete(category)
  await db.insert(category).values(
    Array.from({ length: 12 }, (_, index): typeof category.$inferInsert => ({
      createdAt: new Date("2026-09-24T12:00:00Z"),
      id: `row-${String(index).padStart(2, "0")}`,
      kind: index % 2 === 0 ? "category" : "collection",
      name: `Member ${String(index).padStart(2, "0")}`,
    })),
  )
  vi.spyOn(authServer.auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: USER_ID }))
})
afterEach(() => vi.restoreAllMocks())

describe("list-categories", () => {
  it("lists categories for admins", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: USER_ID }))

    const result = await executeQuery(getCategoriesQuery)
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

    expect(getSessionMock).toHaveBeenCalledTimes(SINGLE_CALL)
  })

  it("rejects when the caller is not an admin", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: USER_ID }))

    await expect(executeQuery(getCategoriesQuery)).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("rejects when the caller is signed out", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeQuery(getCategoriesQuery)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns the remaining page and keeps the database total", async () => {
    const result = await executeQuery(getCategoriesPageQuery({ pageIndex: 1 }))
    expect(result.rows.map((row) => row.id)).toEqual(["row-01", "row-00"])
    expect(result.total).toBe(12)
  })

  it("returns an empty page for an empty table", async () => {
    await db.delete(category)
    const result = await executeQuery(getCategoriesQuery)
    expect(result).toMatchObject({ rows: [], total: 0 })
  })

  it("filters categories before paging and counts only matching records", async () => {
    const result = await executeQuery(getCategoriesPageQuery({ kind: "collection", pageIndex: 1, pageSize: 2 }))
    expect(result.rows.map((row) => row.id)).toEqual(["row-07", "row-05"])
    expect(result.total).toBe(6)
  })
})
