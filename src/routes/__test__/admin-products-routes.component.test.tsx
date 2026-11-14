import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { CATEGORY_KIND, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import { getCategoriesPageQuery } from "~/src/modules/category/use-cases/get-categories"
import { PRODUCT_STATUS, PRODUCT_TYPE } from "~/src/modules/product/product.constants"
import { getProductsPageQuery } from "~/src/modules/product/use-cases/get-products"

import { Route as ProductCreateRoute } from "~/src/routes/admin.products.create"
import { Route as ProductsRoute } from "~/src/routes/admin.products.index"

import {
  adminQueryClient,
  breadcrumbDividers,
  renderAdmin,
  renderAdminPage,
} from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { adminCategory, adminProduct } from "~/src/presentation/components/custom/admin/__test__/products.fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { DashboardActions } from "~/src/presentation/components/custom/admin/dashboard/actions"
import { AdminProductCreatePending, AdminProductsPending } from "~/src/presentation/components/custom/admin/products-pending"

import componentsDataTableMessages from "~/messages/en-US/components.custom.data-table.json"
import navigationProductsMessages from "~/messages/en-US/navigation.products.json"
import pagesAdminProductsCreateMessages from "~/messages/en-US/pages.admin.products.create.json"
import pagesAdminProductsMessages from "~/messages/en-US/pages.admin.products.json"

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
  it("adds the create-product action to the dashboard", () => {
    renderAdmin(<DashboardActions />)
    expect(screen.getByRole("link", { name: navigationProductsMessages.dashboard.addProduct })).toHaveAttribute(
      "href",
      "/admin/products/create",
    )
  })

  it("renders the product form with its translated title and controls", () => {
    renderAdminPage(ProductCreateRoute.options.component)
    expect(screen.getByRole("heading", { name: pagesAdminProductsCreateMessages.metadata.title })).toBeVisible()
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
  })

  it.each([0, 5])("shows the row count for %i products without enabling navigation", (count) => {
    renderProducts(Array.from({ length: count }, (_, index) => adminProduct({ id: `item-${index}`, name: `Item ${index}` })))
    expect(screen.getByRole("button", { name: componentsDataTableMessages.pagination.previousPage })).toBeDisabled()
    expect(screen.getByRole("button", { name: componentsDataTableMessages.pagination.nextPage })).toBeDisabled()
    expect(screen.getByText(count === 0 ? "No rows" : `${count} rows`)).toBeVisible()
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
    expect(screen.getByRole("button", { name: componentsDataTableMessages.pagination.previousPage })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: componentsDataTableMessages.pagination.nextPage }))
    expect(await screen.findByText("Last product")).toBeVisible()
    expect(screen.getByRole("button", { name: componentsDataTableMessages.pagination.nextPage })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: componentsDataTableMessages.pagination.previousPage }))
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
  ] as const)("names the %s panel's first column after its kind and keeps creation available", async (tab, heading, otherHeading) => {
    renderProducts([], tab)
    expect(await screen.findByText("Starters")).toBeVisible()
    expect(screen.getByRole("columnheader", { name: heading })).toBeVisible()
    expect(screen.queryByRole("columnheader", { name: otherHeading })).not.toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: pagesAdminProductsMessages.categories.table.headers.visibility })).toBeVisible()
    expect(screen.getByRole("link", { name: pagesAdminProductsMessages.actions.create })).toHaveAttribute("href", "/admin/products/create")
  })

  it.each([
    [null, "4900 USD"],
    ["", "4900 USD"],
    ["month", "/ month"],
  ])("displays billing information consistently for %s", (billingCycle, expected) => {
    renderProducts([adminProduct({ billingCycle })])
    const [, row] = screen.getAllByRole("row")
    expect(row).toHaveTextContent("Starter Kit")
    expect(row).toHaveTextContent(expected)
    expect(row).toHaveTextContent(pagesAdminProductsMessages.table.statusLabels.published)
  })
})

describe("admin catalog skeletons", () => {
  it.each([
    ["/admin/products", AdminProductsPending],
    ["/admin/products/create", AdminProductCreatePending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter(path) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("draws the breadcrumb trail of /admin/products/create", () => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/admin/products/create") })

    expect(breadcrumbDividers(container)).toHaveLength(2)
  })
})
