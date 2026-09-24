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

import { product } from "~/src/modules/product/product.schema"
import { getProductsPageQuery, getProductsQuery } from "~/src/modules/product/use-cases/get-products"

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
  await db.delete(product)
  await db.insert(product).values(
    Array.from({ length: 12 }, (_, index): typeof product.$inferInsert => ({
      createdAt: new Date("2026-09-24T12:00:00Z"),
      id: `row-${String(index).padStart(2, "0")}`,
      name: `Member ${String(index).padStart(2, "0")}`,
      status: index < 4 ? "draft" : "published",
      type: index % 2 === 0 ? "one_time" : "subscription",
    })),
  )
  vi.spyOn(authServer.auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: USER_ID }))
})
afterEach(() => vi.restoreAllMocks())

describe("list-products", () => {
  it("lists products for admins", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: USER_ID }))

    const result = await executeQuery(getProductsQuery)
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

    await expect(executeQuery(getProductsQuery)).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("rejects when the caller is signed out", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeQuery(getProductsQuery)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns the remaining page and keeps the database total", async () => {
    const result = await executeQuery(getProductsPageQuery({ pageIndex: 1 }))
    expect(result.rows.map((row) => row.id)).toEqual(["row-01", "row-00"])
    expect(result.total).toBe(12)
  })

  it("returns an empty page for an empty table", async () => {
    await db.delete(product)
    const result = await executeQuery(getProductsQuery)
    expect(result).toMatchObject({ rows: [], total: 0 })
  })

  it("filters before paging and counts only matching products", async () => {
    const result = await executeQuery(getProductsPageQuery({ pageIndex: 1, pageSize: 1, status: "draft", type: "subscription" }))
    expect(result.rows.map((row) => row.id)).toEqual(["row-01"])
    expect(result.total).toBe(2)
  })
})
