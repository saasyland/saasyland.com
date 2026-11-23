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
import { CATEGORY_KIND, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import { category } from "~/src/modules/category/category.schema"
import type { Category } from "~/src/modules/category/category.types"
import { getCategoriesPageQuery, getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"

const HEADERS = new Headers()
const USER_ID = "01900000-0000-7000-8000-000000000001"

type AuthApi = typeof auth.api

const getSessionMock = vi.hoisted(() => vi.fn<AuthApi["getSession"]>())

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

const idsOf = async (input: Category["getCategories"]): Promise<string[]> => {
  const { rows } = await executeQuery(getCategoriesPageQuery(input))
  return rows.map(({ id }) => id)
}

beforeEach(async () => {
  await db.delete(category)
  await db.insert(category).values(
    Array.from({ length: 12 }, (_, index): typeof category.$inferInsert => ({
      createdAt: new Date("2026-09-24T12:00:00Z"),
      id: `row-${String(index).padStart(2, "0")}`,
      kind: index % 2 === 0 ? CATEGORY_KIND.CATEGORY : CATEGORY_KIND.COLLECTION,
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

    expect(getSessionMock).toHaveBeenCalledTimes(1)
  })

  it("rejects when the caller is not an admin", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: USER_ID }))

    await expect(executeQuery(getCategoriesQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects when the caller is signed out", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeQuery(getCategoriesQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
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
    const result = await executeQuery(getCategoriesPageQuery({ kind: CATEGORY_KIND.COLLECTION, pageIndex: 1, pageSize: 2 }))
    expect(result.rows.map((row) => row.id)).toEqual(["row-07", "row-05"])
    expect(result.total).toBe(6)
  })

  it("searches names and descriptions, filters by visibility and dates, and sorts on the server", async () => {
    await db.update(category).set({ description: "Hand-picked", visibility: CATEGORY_VISIBILITY.HIDDEN }).where(eq(category.id, "row-03"))
    await db
      .update(category)
      .set({ updatedAt: new Date("2026-11-01T12:00:00Z") })
      .where(eq(category.id, "row-05"))
    await expect(idsOf({ search: "hand-picked" })).resolves.toStrictEqual(["row-03"])
    await expect(idsOf({ filters: { name: "member 1" } })).resolves.toStrictEqual(["row-11", "row-10"])
    await expect(idsOf({ filters: { visibility: [CATEGORY_VISIBILITY.HIDDEN] } })).resolves.toStrictEqual(["row-03"])
    await expect(idsOf({ filters: { updatedAt: { to: new Date("2026-11-02T00:00:00Z").getTime() } } })).resolves.toStrictEqual(["row-05"])
    await expect(idsOf({ filters: { createdAt: { to: new Date("2026-09-01T00:00:00Z").getTime() } } })).resolves.toStrictEqual([])
    await expect(idsOf({ kind: CATEGORY_KIND.COLLECTION, pageSize: 3, sorting: [{ desc: false, id: "name" }] })).resolves.toStrictEqual([
      "row-01",
      "row-03",
      "row-05",
    ])
    await expect(idsOf({ pageSize: 1, sorting: [{ desc: false, id: "visibility" }] })).resolves.toStrictEqual(["row-03"])
    await expect(idsOf({ pageSize: 1, sorting: [{ desc: true, id: "name" }] })).resolves.toStrictEqual(["row-11"])
  })
})
