import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { MAX_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import { CATEGORY_KIND, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import { getCategoriesPageQuery } from "~/src/modules/category/use-cases/get-categories"
import { PRODUCT_STATUS, PRODUCT_TYPE } from "~/src/modules/product/product.constants"
import { getProductsPageQuery } from "~/src/modules/product/use-cases/get-products"

import { Route as ProductsRoute } from "~/src/routes/admin.products.index"

import * as download from "~/src/lib/download"

import { adminQueryClient, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { adminCategory, adminProduct } from "~/src/presentation/components/custom/admin/__test__/products.fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminProductsPending } from "~/src/presentation/components/custom/admin/products-pending"

import gridMessages from "~/messages/en-US/components.custom.data-grid.json"
import pagesAdminProductsMessages from "~/messages/en-US/pages.admin.products.json"
import { routeTree } from "~/src/routeTree.gen"

const products = [
  adminProduct(),
  adminProduct({
    id: "monthly",
    name: "Monthly subscription",
    type: PRODUCT_TYPE.SUBSCRIPTION,
    billingCycle: "month",
    status: PRODUCT_STATUS.DRAFT,
  }),
  adminProduct({
    id: "yearly",
    name: "Yearly subscription",
    type: PRODUCT_TYPE.SUBSCRIPTION,
    billingCycle: "",
    status: PRODUCT_STATUS.ARCHIVED,
  }),
  adminProduct({ id: "course", name: "React course", type: PRODUCT_TYPE.COURSE }),
]
const categories = [
  adminCategory(),
  adminCategory({ id: "hidden", name: "Private category", visibility: CATEGORY_VISIBILITY.HIDDEN }),
  adminCategory({ id: "collection", name: "Starter collection", kind: CATEGORY_KIND.COLLECTION }),
]
const categoryHeading = pagesAdminProductsMessages.categories.table.headers.category
const collectionHeading = pagesAdminProductsMessages.collections.table.headers.collection

afterEach(() => vi.restoreAllMocks())

const renderProducts = (rows: ReturnType<typeof adminProduct>[], tab: "all" | "categories" | "collections" = "all") => {
  vi.spyOn(ProductsRoute, "useSearch").mockReturnValue({ tab })
  const queryClient = adminQueryClient()
  queryClient.setQueryData(getProductsPageQuery().queryKey, { rows, total: rows.length })
  const kind = tab === "collections" ? CATEGORY_KIND.COLLECTION : CATEGORY_KIND.CATEGORY
  queryClient.setQueryData(getCategoriesPageQuery({ kind }).queryKey, { rows: categories, total: categories.length })
  return renderAdminPage(ProductsRoute.options.component, { path: `/admin/products?tab=${tab}`, queryClient })
}

describe("admin catalog", () => {
  it.each([0, 5])("shows the row count for %i products without enabling navigation", (count) => {
    renderProducts(Array.from({ length: count }, (_, index) => adminProduct({ id: `item-${index}`, name: `Item ${index}` })))
    expect(screen.getByRole("button", { name: gridMessages.pagination.previous })).toBeDisabled()
    expect(screen.getByRole("button", { name: gridMessages.pagination.next })).toBeDisabled()
    const first = Math.min(1, count)
    expect(screen.getByText(`${String(first)}–${String(count)} of ${String(count)}`)).toBeVisible()
  })

  it("navigates between server pages and disables navigation at the boundaries", async () => {
    vi.spyOn(ProductsRoute, "useSearch").mockReturnValue({ tab: "all" })
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getProductsPageQuery().queryKey, {
      rows: Array.from({ length: 10 }, (_, index) => adminProduct({ id: `item-${index}`, name: `Item ${index}` })),
      total: 11,
    })
    queryClient.setQueryData(getProductsPageQuery({ pageIndex: 1 }).queryKey, { rows: [adminProduct({ name: "Last product" })], total: 11 })
    for (const pageIndex of [0, 1]) {
      queryClient.setQueryData(getCategoriesPageQuery({ pageIndex, kind: CATEGORY_KIND.CATEGORY }).queryKey, { rows: [], total: 0 })
    }
    renderAdminPage(ProductsRoute.options.component, { queryClient })
    expect(screen.getByRole("button", { name: gridMessages.pagination.previous })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: gridMessages.pagination.next }))
    expect(await screen.findByText("Last product")).toBeVisible()
    expect(screen.getByRole("button", { name: gridMessages.pagination.next })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: gridMessages.pagination.previous }))
    expect(await screen.findByText("Item 0")).toBeVisible()
  })

  it.each([
    ["all", "Starter Kit"],
    ["drafts", "Monthly subscription"],
    ["onetime", "Starter Kit"],
    ["subscriptions", "Monthly subscription"],
    ["categories", "Private category"],
    ["collections", "Starter collection"],
  ] as const)("renders the requested %s product panel", async (tab, expected) => {
    vi.spyOn(ProductsRoute, "useSearch").mockReturnValue({ tab })
    const queryClient = adminQueryClient()
    const productInput = {
      ...(tab === "subscriptions" ? { type: PRODUCT_TYPE.SUBSCRIPTION } : {}),
      ...(tab === "onetime" ? { type: PRODUCT_TYPE.ONE_TIME } : {}),
      ...(tab === "drafts" ? { status: PRODUCT_STATUS.DRAFT } : {}),
    }
    const visibleProducts = products.filter(
      (row) => (!productInput.type || row.type === productInput.type) && (!productInput.status || row.status === productInput.status),
    )
    queryClient.setQueryData(getProductsPageQuery(productInput).queryKey, { rows: visibleProducts, total: visibleProducts.length })
    const kind = tab === "collections" ? CATEGORY_KIND.COLLECTION : CATEGORY_KIND.CATEGORY
    const visibleCategories = categories.filter((row) => row.kind === kind)
    queryClient.setQueryData(getCategoriesPageQuery({ kind }).queryKey, { rows: visibleCategories, total: visibleCategories.length })
    renderAdminPage(ProductsRoute.options.component, { queryClient })
    expect(screen.getByRole("heading", { name: pagesAdminProductsMessages.title })).toBeVisible()
    expect(await screen.findByText(expected)).toBeVisible()
    if (tab === "onetime") {
      expect(screen.queryByText("Monthly subscription")).not.toBeInTheDocument()
    }
    if (tab === "subscriptions") {
      expect(screen.queryByText("Starter Kit")).not.toBeInTheDocument()
    }
    if (tab === "collections") {
      expect(screen.queryByText("Private category")).not.toBeInTheDocument()
    }
  })

  it.each([
    ["categories", categoryHeading, collectionHeading],
    ["collections", collectionHeading, categoryHeading],
  ] as const)("names the %s panel's first column after its kind", async (tab, heading, otherHeading) => {
    renderProducts([], tab)
    expect(await screen.findByText("Starters")).toBeVisible()
    expect(screen.getByRole("columnheader", { name: new RegExp(`^${heading}`, "u") })).toBeVisible()
    expect(screen.queryByRole("columnheader", { name: new RegExp(`^${otherHeading}`, "u") })).not.toBeInTheDocument()
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toStrictEqual([
      heading,
      pagesAdminProductsMessages.categories.table.headers.visibility,
      pagesAdminProductsMessages.categories.table.headers.lastUpdated,
    ])
    expect(screen.getByRole("table", { name: pagesAdminProductsMessages.tabs[tab] })).toBeVisible()
  })

  it.each([
    [null, "$49.00"],
    ["", "$49.00"],
    ["month", "$49.00 / month"],
  ])("displays billing information consistently for %s", (billingCycle, expected) => {
    renderProducts([adminProduct({ billingCycle })])
    const [, row] = screen.getAllByRole("row")
    expect(row).toHaveTextContent("Starter Kit")
    expect(row).toHaveTextContent(expected)
    expect(row).toHaveTextContent(pagesAdminProductsMessages.table.statusLabels.published)
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toStrictEqual([
      pagesAdminProductsMessages.table.headers.product,
      pagesAdminProductsMessages.table.headers.type,
      pagesAdminProductsMessages.table.headers.pricing,
      pagesAdminProductsMessages.table.headers.status,
      pagesAdminProductsMessages.table.headers.updatedAt,
    ])
    expect(within(row ?? document.body).queryByRole("button")).toBeNull()
  })

  it.each([
    ["USD", 4900, "$49.00"],
    ["EUR", 1999, "€19.99"],
    ["JPY", 4900, "¥4,900"],
    ["KRW", 59_000, "₩59,000"],
  ] as const)("shows a %s price of %i minor units as %s", (currency, priceCents, expected) => {
    renderProducts([adminProduct({ currency, priceCents })])
    const [, row] = screen.getAllByRole("row")

    expect(within(row ?? document.body).getByText(expected)).toBeVisible()
    expect(row).not.toHaveTextContent(String(priceCents))
  })
})

describe("admin catalog export", () => {
  it("exports the products with their type, price and billing cycle, and status as the table names them", async () => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
    const rows = [
      adminProduct({ billingCycle: "month", id: "monthly", name: "Monthly", type: PRODUCT_TYPE.SUBSCRIPTION }),
      adminProduct({ billingCycle: "", id: "kit", name: "Kit", status: PRODUCT_STATUS.DRAFT }),
      adminProduct({ billingCycle: null, currency: "JPY", id: "yen", name: "Yen", priceCents: 4900 }),
    ]
    const { queryClient } = renderProducts(rows)
    queryClient.setQueryData(getProductsPageQuery({ pageSize: MAX_PAGE_SIZE }).queryKey, { rows, total: rows.length })

    await userEvent.click(screen.getByRole("button", { name: gridMessages.toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    const { statusLabels, typeLabels } = pagesAdminProductsMessages.table
    expect(
      vi
        .mocked(download.downloadFile)
        .mock.calls[0]?.[0].content.split("\r\n")
        .slice(1, 4)
        .map((line) => line.split(",").slice(0, 4)),
    ).toStrictEqual([
      ["Monthly", typeLabels.subscription, "49.00 USD / month", statusLabels.published],
      ["Kit", typeLabels.one_time, "49.00 USD", statusLabels.draft],
      ["Yen", typeLabels.one_time, "4900 JPY", statusLabels.published],
    ])
  })

  it("exports the categories with their visibility", async () => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
    const { queryClient } = renderProducts([], "categories")
    queryClient.setQueryData(getCategoriesPageQuery({ kind: CATEGORY_KIND.CATEGORY, pageSize: MAX_PAGE_SIZE }).queryKey, {
      rows: categories,
      total: categories.length,
    })

    await userEvent.click(screen.getByRole("button", { name: gridMessages.toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    const { visibilityLabels } = pagesAdminProductsMessages.table
    expect(
      vi
        .mocked(download.downloadFile)
        .mock.calls[0]?.[0].content.split("\r\n")
        .slice(1, 3)
        .map((line) => line.split(",").slice(0, 2)),
    ).toStrictEqual([
      ["Starters", visibilityLabels.public],
      ["Private category", visibilityLabels.hidden],
    ])
  })
})

describe("admin catalog skeletons", () => {
  it("renders the skeleton of the catalog", () => {
    const page = markupOf(<AdminProductsPending />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/admin/products", routeTree) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})
