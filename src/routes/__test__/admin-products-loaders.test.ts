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

  it("reads the Polar catalogue and the sales from the copies of the orders before rendering /admin/products", async () => {
    vi.spyOn(polarProductsQuery, "queryFn")
    vi.spyOn(productSalesQuery, "queryFn")
    const router = await loadAsAdmin("/admin/products")
    expectPrefetched(router, polarProductsQuery, expect.objectContaining({ read: POLAR_READ.AVAILABLE }))
    expectPrefetched(router, productSalesQuery, { products: [] })
  })

  it("prefetches the product count the catalogue adds to /admin", async () => {
    vi.spyOn(polarProductsQuery, "queryFn")
    expectPrefetched(await loadAsAdmin("/admin"), polarProductsQuery, expect.objectContaining({ read: POLAR_READ.AVAILABLE }))
  })
})
