import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"
import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"

import { EMPTY_PAGE, expectLocalizedAdminPage, expectPrefetched, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

import { getRouter } from "~/src/router"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

afterEach(() => vi.restoreAllMocks())

describe("admin catalog route loaders", () => {
  it.each(["/admin/products", "/admin/products/create"])("loads localized metadata for an authorized administrator at %s", async (path) => {
    expectLocalizedAdminPage(await loadAsAdmin(path))
  })

  it("populates required query data before rendering /admin/products", async () => {
    vi.spyOn(getProductsQuery, "queryFn")
    vi.spyOn(getCategoriesQuery, "queryFn")
    const router = await loadAsAdmin("/admin/products")
    expectPrefetched(router, getProductsQuery, EMPTY_PAGE)
    expectPrefetched(router, getCategoriesQuery, EMPTY_PAGE)
  })

  it("prefetches the product count the catalog adds to /admin", async () => {
    vi.spyOn(getProductsQuery, "queryFn")
    expectPrefetched(await loadAsAdmin("/admin"), getProductsQuery, EMPTY_PAGE)
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
})
