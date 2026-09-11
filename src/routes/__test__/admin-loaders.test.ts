import { createMemoryHistory } from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { loadRouteMessages } from "~/src/integrations/use-intl/i18n.metadata"

import { getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"
import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as BlogRoute } from "~/src/routes/admin.blog.index"
import { Route as ProductsRoute } from "~/src/routes/admin.products.index"
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
  return { ...actual, getCategoriesQuery: { ...actual.getCategoriesQuery, queryFn: vi.fn(() => Promise.resolve([])) } }
})
vi.mock(import("~/src/modules/product/use-cases/get-products"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getProductsQuery: { ...actual.getProductsQuery, queryFn: vi.fn(() => Promise.resolve([])) } }
})
vi.mock(import("~/src/modules/user/use-cases/get-users"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getUsersQuery: { ...actual.getUsersQuery, queryFn: vi.fn(() => Promise.resolve([])) } }
})
vi.mock(import("~/src/modules/session/use-cases/get-active-sessions"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getActiveSessionsQuery: { ...actual.getActiveSessionsQuery, queryFn: vi.fn(() => Promise.resolve([])) } }
})
vi.mock(import("~/src/integrations/use-intl/i18n.metadata"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    loadRouteMessages: vi.fn<typeof actual.loadRouteMessages>(({ pathname }) =>
      Promise.resolve({ metadata: { description: "Admin workspace", locale: "en-US" as const, pathname, title: "Admin" } }),
    ),
  }
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
    expect(loadRouteMessages).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: path, queryClient: router.options.context.queryClient }),
    )
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
      expect(router.options.context.queryClient.getQueryData(query.queryKey)).toEqual([])
    }
  })

  it("redirects the users index to the complete user list", async () => {
    await loadAdmin("/admin/users")
    const beforeLoad = vi.fn(UsersIndexRoute.options.beforeLoad)
    expect(beforeLoad).toThrow()
    expect(beforeLoad.mock.results[0]?.value).toHaveProperty("options.to", "/admin/users/all")
  })

  it.each([BlogRoute, ProductsRoute])("accepts only string values in validated catalog searches", (route) => {
    const validate = route.options.validateSearch
    if (typeof validate !== "function") {
      throw new TypeError("Missing search validator")
    }
    expect(validate({ view: "table", tab: "categories", invalid: 12, object: { bad: true } })).toEqual({ view: "table", tab: "categories" })
  })
})
