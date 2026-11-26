import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { POLAR_READ } from "~/src/modules/order/order.constants"
import { productSalesQuery } from "~/src/modules/order/use-cases/get-product-sales"

import { expectLocalizedAdminPage, expectPrefetched, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

import { polarProductsQuery } from "~/src/lib/polar-catalogue"

afterEach(() => vi.restoreAllMocks())

describe("admin products route loaders", () => {
  it("loads localized metadata for an authorized administrator at /admin/products", async () => {
    expectLocalizedAdminPage(await loadAsAdmin("/admin/products"))
  })

  it("reads the Polar catalogue and the sales from the copies of the orders for /admin/products", async () => {
    vi.spyOn(polarProductsQuery, "queryFn")
    vi.spyOn(productSalesQuery, "queryFn")
    const router = await loadAsAdmin("/admin/products")
    await vi.waitFor(() => {
      expect(router.options.context.queryClient.isFetching()).toBe(0)
    })
    expectPrefetched(router, polarProductsQuery, expect.objectContaining({ read: POLAR_READ.AVAILABLE }))
    expectPrefetched(router, productSalesQuery, { products: [] })
  })

  it.each(["/admin", "/admin/products"])("renders %s without waiting for the Polar catalogue, which streams in after", async (path) => {
    vi.spyOn(polarProductsQuery, "queryFn").mockReturnValue(new Promise(() => {}))
    const router = await loadAsAdmin(path)

    expect(router.state.matches.at(-1)?.status).toBe("success")
    expect(router.options.context.queryClient.getQueryState(polarProductsQuery.queryKey)?.status).toBe("pending")
  })

  it("prefetches the product count the catalogue adds to /admin", async () => {
    vi.spyOn(polarProductsQuery, "queryFn")
    const router = await loadAsAdmin("/admin")
    await vi.waitFor(() => {
      expect(router.options.context.queryClient.isFetching()).toBe(0)
    })
    expectPrefetched(router, polarProductsQuery, expect.objectContaining({ read: POLAR_READ.AVAILABLE }))
  })
})
