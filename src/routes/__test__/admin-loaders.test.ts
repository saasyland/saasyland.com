import { createMemoryHistory } from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"
import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as UsersIndexRoute } from "~/src/routes/admin.users.index"

import { getRouter } from "~/src/router"

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getCurrentSessionQuery: {
      ...actual.getCurrentSessionQuery,
      queryFn: vi.fn(() => Promise.resolve(createAuthSessionFixture({ role: "admin" }))),
    },
  }
})
vi.mock(import("~/src/modules/category/use-cases/get-categories"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCategoriesQuery: { ...actual.getCategoriesQuery, queryFn: vi.fn(() => Promise.resolve({ rows: [], total: 0 })) } }
})
vi.mock(import("~/src/modules/product/use-cases/get-products"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getProductsQuery: { ...actual.getProductsQuery, queryFn: vi.fn(() => Promise.resolve({ rows: [], total: 0 })) } }
})
vi.mock(import("~/src/modules/user/use-cases/get-users"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getUsersQuery: { ...actual.getUsersQuery, queryFn: vi.fn(() => Promise.resolve({ rows: [], total: 0, pendingVerification: 0 })) },
  }
})
vi.mock(import("~/src/modules/session/use-cases/get-active-sessions"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getActiveSessionsQuery: { ...actual.getActiveSessionsQuery, queryFn: vi.fn(() => Promise.resolve([])) } }
})
vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

const loadAdmin = async (path: string) => {
  const router = getRouter()
  router.options.context.queryClient.setDefaultOptions({ queries: { retry: false } })
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

beforeEach(() => vi.clearAllMocks())

describe("admin route loaders", () => {
  it.each([
    "/admin",
    "/admin/analytics",
    "/admin/blog",
    "/admin/blog/create",
    "/admin/courses/create",
    "/admin/landing-page",
    "/admin/payments",
    "/admin/pricing-models",
    "/admin/products",
    "/admin/products/create",
    "/admin/settings",
    "/admin/users/all",
    "/admin/users/invitations",
    "/admin/users/roles",
    "/admin/users/security",
  ])("loads localized metadata for an authorized administrator at %s", async (path) => {
    const router = await loadAdmin(path)
    expect(router.state.matches.at(-1)?.status).toBe("success")
    expect(getCurrentSessionQuery.queryFn).toHaveBeenCalledOnce()
    expect(router.state.matches.at(-1)?.loaderData).toHaveProperty("locale", "en-US")
    expect(router.state.matches.at(-1)?.loaderData).toHaveProperty("metadata.title")
  })

  it.each([
    ["/admin", [getProductsQuery, getUsersQuery]],
    ["/admin/products", [getProductsQuery, getCategoriesQuery]],
    ["/admin/settings", [getActiveSessionsQuery]],
    ["/admin/users/all", [getUsersQuery]],
  ] as const)("populates required query data before rendering %s", async (path, queries) => {
    const router = await loadAdmin(path)
    for (const query of queries) {
      expect(query.queryFn).toHaveBeenCalledOnce()
      expect(router.options.context.queryClient.getQueryData(query.queryKey)).toEqual(
        query === getActiveSessionsQuery ? [] : expect.objectContaining({ rows: [], total: 0 }),
      )
    }
  })

  it("redirects the users index to the complete user list", async () => {
    await loadAdmin("/admin/users")
    const beforeLoad = vi.fn(UsersIndexRoute.options.beforeLoad)
    expect(beforeLoad).toThrow()
    expect(beforeLoad.mock.results[0]?.value).toHaveProperty("options.to", "/admin/users/all")
  })

  it.each([
    ["categories", "categories"],
    ["drafts", "drafts"],
    [undefined, "all"],
    ["invalid", "all"],
    [["all"], "all"],
  ])("validates the requested product tab: %s", (tab, expected) => {
    const router = getRouter()
    expect(router.matchRoutes("/admin/products", { tab }).at(-1)?.search).toMatchObject({ tab: expected })
  })

  it.each([
    ["table", "table"],
    ["grid", "grid"],
    [undefined, "grid"],
    ["invalid", "grid"],
    [12, "grid"],
  ])("validates the requested blog view: %s", (view, expected) => {
    const router = getRouter()
    expect(router.matchRoutes("/admin/blog", { view }).at(-1)?.search).toMatchObject({ view: expected })
  })
})
