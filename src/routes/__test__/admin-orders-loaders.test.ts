import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import { POLAR_READ } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { getCustomersQuery } from "~/src/modules/order/use-cases/get-customers"
import { orderFiltersQuery } from "~/src/modules/order/use-cases/get-order-filters"
import { getOrdersQuery } from "~/src/modules/order/use-cases/get-orders"
import { userOrdersQuery } from "~/src/modules/order/use-cases/get-user-orders"

import { EMPTY_PAGE, expectLocalizedAdminPage, expectPrefetched, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

const ORDER = orderRow({ description: "Agency", id: "ord_loader" })

beforeEach(async () => {
  await db.delete(order)
})

afterEach(() => vi.restoreAllMocks())

describe("admin order route loaders", () => {
  it("loads the orders and the products, discounts and countries to filter them by at /admin/orders", async () => {
    vi.spyOn(getOrdersQuery, "queryFn")
    vi.spyOn(orderFiltersQuery, "queryFn")
    const router = await loadAsAdmin("/admin/orders")

    expectLocalizedAdminPage(router)
    expectPrefetched(router, getOrdersQuery, EMPTY_PAGE)
    expectPrefetched(router, orderFiltersQuery, { countries: [], discounts: [], products: [] })
  })

  it("loads an order with the page title of its product and falls back when Polar does not know it", async () => {
    await db.insert(order).values(ORDER)
    const router = await loadAsAdmin(`/admin/orders/${ORDER.id}`)
    const match = router.state.matches.at(-1)

    expect(match?.status).toBe("success")
    expect(match?.loaderData).toStrictEqual({ locale: "en-US", pathname: `/admin/orders/${ORDER.id}`, title: "Agency" })
    expect(router.options.context.queryClient.getQueryData(["order", "getOrder", { orderId: ORDER.id }])).toHaveProperty("polar", {
      read: POLAR_READ.UNAVAILABLE,
    })
  })

  it("answers not found for an order the copy does not have", async () => {
    const router = await loadAsAdmin("/admin/orders/ord_missing")

    expect(router.state.matches.at(-1)?.status).toBe("notFound")
  })

  it("loads the customers tab of user management", async () => {
    vi.spyOn(getCustomersQuery, "queryFn")
    const router = await loadAsAdmin("/admin/users/customers")

    expectLocalizedAdminPage(router)
    expectPrefetched(router, getCustomersQuery, EMPTY_PAGE)
  })

  it("loads the orders of a profile with the profile", async () => {
    const router = await loadAsAdmin("/admin/users/ord-buyer")
    const { queryClient } = router.options.context

    expect(queryClient.getQueryData(userOrdersQuery({ userId: "ord-buyer" }).queryKey)).toStrictEqual({ orders: [], revenue: [] })
  })
})
