import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { controlTimers, passTime } from "~/src/platform/testing/lib/clock"
import { fill } from "~/src/platform/testing/lib/fill"
import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { POLAR_PRICE_TYPE, POLAR_PRODUCT_STATUS, POLAR_RECURRING_INTERVAL } from "~/src/integrations/polar/polar.constants"
import { DATA_GRID_TYPING_DELAY_MS } from "~/src/integrations/tanstack-table/table.features"

import { POLAR_READ } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"
import { productSalesQuery } from "~/src/modules/order/use-cases/get-product-sales"

import { Route as ProductsRoute } from "~/src/routes/admin.products.index"

import * as download from "~/src/lib/download"
import { type PolarCatalogue, polarProductsQuery } from "~/src/lib/polar-catalogue"

import { adminQueryClient, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { adminPolarProduct } from "~/src/presentation/components/custom/admin/__test__/products.fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminProductsPending } from "~/src/presentation/components/custom/admin/products-pending"

import gridMessages from "~/messages/en-US/components.custom.data-grid.json"
import productsMessages from "~/messages/en-US/pages.admin.products.json"
import { routeTree } from "~/src/routeTree.gen"

const { headers, statusLabels } = productsMessages.table

const CORE = adminPolarProduct()

const PLAN = {
  ...adminPolarProduct({
    id: "prod_plan",
    licenseKeys: [{ activations: undefined, id: "benefit_plan" }],
    name: "Team plan",
    polarUrl: "https://sandbox.polar.sh/dashboard/saasyland/products/prod_plan",
    prices: [
      { amountType: POLAR_PRICE_TYPE.FIXED, id: "price_plan", money: { amount: 19, currency: "USD" } },
      { amountType: POLAR_PRICE_TYPE.FIXED, id: "price_plan_euro", money: { amount: 17, currency: "EUR" } },
    ],
    recurrence: { count: 1, interval: POLAR_RECURRING_INTERVAL.MONTH },
    status: POLAR_PRODUCT_STATUS.PRIVATE,
  }),
  description: undefined,
}

const TIP = adminPolarProduct({
  description: "Pay what the course was worth to you",
  id: "prod_tip",
  licenseKeys: [],
  name: "Tip jar",
  polarUrl: "https://sandbox.polar.sh/dashboard/saasyland/products/prod_tip",
  prices: [{ amountType: POLAR_PRICE_TYPE.CUSTOM, id: "price_tip", money: { amount: 5, currency: "USD" } }],
  status: POLAR_PRODUCT_STATUS.DRAFT,
})

const SEATS = adminPolarProduct({
  id: "prod_seats",
  licenseKeys: [],
  name: "Seats",
  polarUrl: "https://sandbox.polar.sh/dashboard/saasyland/products/prod_seats",
  prices: [{ amountType: POLAR_PRICE_TYPE.SEAT_BASED, currency: "USD", id: "price_seats" }],
  recurrence: { count: 3, interval: POLAR_RECURRING_INTERVAL.MONTH },
  status: POLAR_PRODUCT_STATUS.ARCHIVED,
})

const RETIRED = adminPolarProduct({
  id: "prod_retired",
  licenseKeys: [],
  name: "Retired kit",
  polarUrl: "https://sandbox.polar.sh/dashboard/saasyland/products/prod_retired",
  prices: [],
  status: POLAR_PRODUCT_STATUS.ARCHIVED,
})

const PRODUCTS = [CORE, PLAN, TIP, SEATS, RETIRED]

const SALES: Order["productSales"][] = [
  { productId: CORE.id, revenue: [{ amount: 498, currency: "USD" }], sales: 2 },
  {
    productId: SEATS.id,
    revenue: [
      { amount: 25_000, currency: "JPY" },
      { amount: 0, currency: "USD" },
    ],
    sales: 2,
  },
  { productId: "prod_deleted", revenue: [{ amount: 99, currency: "USD" }], sales: 1 },
]

afterEach(() => vi.restoreAllMocks())

const LISTED: PolarCatalogue = { products: PRODUCTS, read: POLAR_READ.AVAILABLE }

const renderProducts = (catalogue: PolarCatalogue = LISTED) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(polarProductsQuery.queryKey, catalogue)
  queryClient.setQueryData(productSalesQuery.queryKey, { products: SALES })
  return renderAdminPage(ProductsRoute.options.component, { path: "/admin/products", queryClient })
}

const rowOf = (name: string): HTMLElement => {
  const row = screen.getByText(name, { selector: "span" }).closest("tr")
  if (row === null) {
    throw new Error(`No row shows ${name}`)
  }
  return row
}

describe("admin products", () => {
  it("lists each product of the Polar catalogue with its prices, licence key, status, sales and what buyers paid", () => {
    renderProducts()

    expect(screen.getByRole("heading", { name: productsMessages.title })).toBeVisible()
    expect(rowOf("Core")).toHaveTextContent(
      ["Core", "The starter with every module", "$249.00", "Up to 3 machines", statusLabels.public, "2", "$498.00", CORE.id].join(""),
    )
    expect(rowOf("Team plan")).toHaveTextContent(
      [
        "Team plan",
        "$19.00 per month",
        "€17.00 per month",
        productsMessages.table.unlimitedMachines,
        statusLabels.private,
        "0",
        "Nothing paid",
      ].join(""),
    )
    expect(rowOf("Tip jar")).toHaveTextContent(
      [
        "Tip jar",
        "Pay what the course was worth to you",
        "Pay what you want, from $5.00",
        productsMessages.table.noLicenseKey,
        statusLabels.draft,
        "0",
        productsMessages.table.noRevenue,
        TIP.id,
      ].join(""),
    )
    expect(rowOf("Seats")).toHaveTextContent(
      [
        "Seats",
        "The starter with every module",
        "Per seat (USD) every 3 months",
        productsMessages.table.noLicenseKey,
        statusLabels.archived,
        "2",
        "¥25,000$0.00",
        SEATS.id,
      ].join(""),
    )
    expect(rowOf("Retired kit")).toHaveTextContent(productsMessages.table.prices.none)
    expect(screen.queryByText("prod_deleted")).not.toBeInTheDocument()
  })

  it("names its columns in order, after the selection column", () => {
    renderProducts()

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toStrictEqual([
      "",
      headers.product,
      headers.prices,
      headers.licenseKeys,
      headers.status,
      headers.sales,
      headers.revenue,
      headers.polar,
    ])
    expect(screen.getByRole("table", { name: productsMessages.title })).toBeVisible()
  })

  it("links each product to its page in the Polar dashboard, in a new tab", () => {
    renderProducts()

    const link = screen.getByRole("link", { name: `Open ${PLAN.name} in Polar` })

    expect(link).toHaveAttribute("href", PLAN.polarUrl)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
  })

  it("says when Polar did not send the products instead of showing an empty list", () => {
    renderProducts({ products: [], read: POLAR_READ.UNAVAILABLE })

    expect(screen.getByRole("status")).toHaveTextContent(productsMessages.unavailable.title + productsMessages.unavailable.description)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("says when the Polar organisation has no products yet", () => {
    renderProducts({ products: [], read: POLAR_READ.AVAILABLE })

    expect(screen.getByText(productsMessages.table.empty)).toBeVisible()
    expect(screen.getByText(productsMessages.table.emptyDescription)).toBeVisible()
  })

  it("narrows the list to the products whose name matches the search", async () => {
    const user = controlTimers()
    renderProducts()

    await fill(user, screen.getByRole("searchbox", { name: productsMessages.table.search }), "plan")
    await passTime(DATA_GRID_TYPING_DELAY_MS)

    expect(screen.getAllByRole("row")).toHaveLength(2)
    expect(rowOf("Team plan")).toBeVisible()
  })
})

describe("admin products export", () => {
  it("exports the products with their prices, licence keys, status, sales, revenue and Polar page as the table names them", async () => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
    renderProducts()

    await userEvent.click(screen.getByRole("button", { name: gridMessages.toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    expect(vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.split("\r\n").slice(0, 5)).toStrictEqual([
      `﻿${[headers.product, headers.prices, headers.licenseKeys, headers.status, headers.sales, headers.revenue, headers.polar].join(",")}`,
      ["Core", "249.00 USD", "Up to 3 machines", statusLabels.public, "2", "498.00 USD", CORE.polarUrl].join(","),
      [
        "Team plan",
        "19.00 USD per month; 17.00 EUR per month",
        productsMessages.table.unlimitedMachines,
        statusLabels.private,
        "0",
        "",
        PLAN.polarUrl,
      ].join(","),
      ["Tip jar", '"Pay what you want, from 5.00 USD"', "", statusLabels.draft, "0", "", TIP.polarUrl].join(","),
      ["Seats", "Per seat (USD) every 3 months", "", statusLabels.archived, "2", "25000 JPY; 0.00 USD", SEATS.polarUrl].join(","),
    ])
  })
})

describe("admin products skeleton", () => {
  it("renders the skeleton of the products page", () => {
    const page = markupOf(<AdminProductsPending />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/admin/products", routeTree) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})
