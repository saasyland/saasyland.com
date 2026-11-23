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
import { PRODUCT_STATUS, PRODUCT_TYPE } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import type { Product } from "~/src/modules/product/product.types"
import { getProductsPageQuery, getProductsQuery } from "~/src/modules/product/use-cases/get-products"

import { DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

const HEADERS = new Headers()
const USER_ID = "01900000-0000-7000-8000-000000000001"

type AuthApi = typeof auth.api

const getSessionMock = vi.hoisted(() => vi.fn<AuthApi["getSession"]>())

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

const productIdsOf = async (input: Product["getProducts"]): Promise<string[]> => {
  const { rows } = await executeQuery(getProductsPageQuery(input))
  return rows.map(({ id }) => id)
}

beforeEach(async () => {
  await db.delete(product)
  await db.insert(product).values(
    Array.from({ length: 12 }, (_, index): typeof product.$inferInsert => ({
      createdAt: new Date("2026-09-24T12:00:00Z"),
      id: `row-${String(index).padStart(2, "0")}`,
      name: `Member ${String(index).padStart(2, "0")}`,
      status: index < 4 ? PRODUCT_STATUS.DRAFT : PRODUCT_STATUS.PUBLISHED,
      type: index % 2 === 0 ? PRODUCT_TYPE.ONE_TIME : PRODUCT_TYPE.SUBSCRIPTION,
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

    expect(getSessionMock).toHaveBeenCalledTimes(1)
  })

  it("rejects when the caller is not an admin", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: USER_ID }))

    await expect(executeQuery(getProductsQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects when the caller is signed out", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeQuery(getProductsQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
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

  it("lists each product's price in minor units with its currency code", async () => {
    await db.delete(product)
    await db.insert(product).values([
      {
        createdAt: new Date("2026-09-25T12:00:00Z"),
        currency: "jpy",
        id: "yen",
        name: "Yen",
        priceCents: 4900,
        type: PRODUCT_TYPE.ONE_TIME,
      },
      { createdAt: new Date("2026-09-24T12:00:00Z"), id: "dollar", name: "Dollar", priceCents: 4900, type: PRODUCT_TYPE.ONE_TIME },
    ])

    const { rows } = await executeQuery(getProductsQuery)

    expect(rows.map(({ currency, id, priceCents }) => ({ currency, id, priceCents }))).toStrictEqual([
      { currency: "JPY", id: "yen", priceCents: 4900 },
      { currency: DEFAULT_CURRENCY_CODE, id: "dollar", priceCents: 4900 },
    ])
  })

  it("refuses to list a product whose currency is not an ISO 4217 code", async () => {
    await db.insert(product).values({ currency: "XYZ", id: "unknown-currency", name: "Unknown", type: PRODUCT_TYPE.ONE_TIME })

    await expect(executeQuery(getProductsQuery)).rejects.toThrow()
  })

  it("filters before paging and counts only matching products", async () => {
    const result = await executeQuery(
      getProductsPageQuery({ pageIndex: 1, pageSize: 1, status: PRODUCT_STATUS.DRAFT, type: PRODUCT_TYPE.SUBSCRIPTION }),
    )
    expect(result.rows.map((row) => row.id)).toEqual(["row-01"])
    expect(result.total).toBe(2)
  })

  it("searches names and descriptions, filters by type, status, price and dates, and sorts on the server", async () => {
    await db.update(product).set({ description: "Team seats", priceCents: 4900 }).where(eq(product.id, "row-05"))
    await db
      .update(product)
      .set({ priceCents: 19_900, updatedAt: new Date("2026-11-01T12:00:00Z") })
      .where(eq(product.id, "row-07"))

    await expect(productIdsOf({ search: "team seats" })).resolves.toStrictEqual(["row-05"])
    await expect(productIdsOf({ filters: { product: "member 1" } })).resolves.toStrictEqual(["row-11", "row-10"])
    await expect(productIdsOf({ filters: { status: [PRODUCT_STATUS.DRAFT], type: [PRODUCT_TYPE.SUBSCRIPTION] } })).resolves.toStrictEqual([
      "row-03",
      "row-01",
    ])
    await expect(productIdsOf({ filters: { pricing: { max: 100, min: 40 } } })).resolves.toStrictEqual(["row-05"])
    await expect(productIdsOf({ filters: { pricing: { min: 100 } } })).resolves.toStrictEqual(["row-07"])
    await expect(productIdsOf({ filters: { updatedAt: { to: new Date("2026-11-02T00:00:00Z").getTime() } } })).resolves.toStrictEqual([
      "row-07",
    ])
    await expect(productIdsOf({ filters: { createdAt: { from: new Date("2026-10-01T00:00:00Z").getTime() } } })).resolves.toStrictEqual([])
    await expect(productIdsOf({ pageSize: 2, sorting: [{ desc: true, id: "pricing" }] })).resolves.toStrictEqual(["row-07", "row-05"])
    await expect(
      productIdsOf({ pageSize: 2, sorting: [{ desc: false, id: "product" }], type: PRODUCT_TYPE.ONE_TIME }),
    ).resolves.toStrictEqual(["row-00", "row-02"])
  })
})
