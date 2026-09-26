import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getCategoriesPageQuery } from "~/src/modules/category/use-cases/get-categories"
import { getProductsPageQuery } from "~/src/modules/product/use-cases/get-products"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as DashboardRoute } from "~/src/routes/admin.index"
import { Route as ProductsRoute } from "~/src/routes/admin.products.index"

import {
  adminCategory,
  adminProduct,
  adminQueryClient,
  adminUser,
  renderAdmin,
} from "~/src/presentation/components/custom/admin/__test__/fixtures"

import componentsDataTableMessages from "~/messages/en-US/components.custom.data-table.json"
import pagesAdminDashboardMessages from "~/messages/en-US/pages.admin.dashboard.json"
import pagesAdminProductsMessages from "~/messages/en-US/pages.admin.products.json"

const products = [
  adminProduct(),
  adminProduct({ id: "monthly", name: "Monthly subscription", type: "subscription", billingCycle: "month", status: "draft" }),
  adminProduct({ id: "yearly", name: "Yearly subscription", type: "subscription", billingCycle: "", status: "archived" }),
  adminProduct({ id: "course", name: "React course", type: "course" }),
]
const categories = [
  adminCategory(),
  adminCategory({ id: "hidden", name: "Private category", visibility: "hidden" }),
  adminCategory({ id: "collection", name: "Starter collection", kind: "collection" }),
]
const categoryHeading = pagesAdminProductsMessages.categories.table.headers.category
const collectionHeading = pagesAdminProductsMessages.collections.table.headers.collection

afterEach(() => vi.restoreAllMocks())

const renderProducts = (rows: ReturnType<typeof adminProduct>[], tab: "all" | "categories" | "collections" = "all") => {
  vi.spyOn(ProductsRoute, "useSearch").mockReturnValue({ tab })
  const queryClient = adminQueryClient()
  queryClient.setQueryData(getProductsPageQuery().queryKey, { rows, total: rows.length })
  const kind = tab === "collections" ? "collection" : "category"
  queryClient.setQueryData(getCategoriesPageQuery({ kind }).queryKey, { rows: categories, total: categories.length })
  const Page = ProductsRoute.options.component
  if (!Page) {
    throw new Error("Missing product page")
  }
  return renderAdmin(<Page />, { path: `/admin/products?tab=${tab}`, queryClient })
}

describe("admin catalog", () => {
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
      queryClient.setQueryData(getCategoriesPageQuery({ pageIndex, kind: "category" }).queryKey, { rows: [], total: 0 })
    }
    const Page = ProductsRoute.options.component
    if (!Page) {
      throw new Error("Missing product page")
    }
    renderAdmin(<Page />, { queryClient })
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
    ["courses", pagesAdminProductsMessages.courses.empty.title],
  ] as const)("renders the requested %s product panel", async (tab, expected) => {
    vi.spyOn(ProductsRoute, "useSearch").mockReturnValue({ tab })
    const queryClient = adminQueryClient()
    const productInput = {
      ...(tab === "subscriptions" ? { type: "subscription" as const } : {}),
      ...(tab === "onetime" ? { type: "one_time" as const } : {}),
      ...(tab === "drafts" ? { status: "draft" as const } : {}),
    }
    const visibleProducts = products.filter(
      (row) => (!productInput.type || row.type === productInput.type) && (!productInput.status || row.status === productInput.status),
    )
    queryClient.setQueryData(getProductsPageQuery(productInput).queryKey, { rows: visibleProducts, total: visibleProducts.length })
    const kind = tab === "collections" ? "collection" : "category"
    const visibleCategories = categories.filter((row) => row.kind === kind)
    queryClient.setQueryData(getCategoriesPageQuery({ kind }).queryKey, { rows: visibleCategories, total: visibleCategories.length })
    const Page = ProductsRoute.options.component
    if (!Page) {
      throw new Error("Missing product page")
    }
    renderAdmin(<Page />, { queryClient })
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

describe("admin dashboard", () => {
  it.each([0, 1, 6])("shows counts and a bounded preview for %i users", (count) => {
    const queryClient = adminQueryClient()
    const users = Array.from({ length: count }, (_, index) =>
      adminUser({
        id: `user-${index}`,
        name: `Member ${index}`,
        emailVerified: index % 2 === 0,
        banned: index === 3,
      }),
    )
    queryClient.setQueryData(getUsersQuery.queryKey, {
      rows: users,
      total: users.length,
      pendingVerification: users.filter((row) => !row.emailVerified && !row.banned).length,
    })
    const Page = DashboardRoute.options.component
    if (!Page) {
      throw new Error("Missing dashboard page")
    }
    renderAdmin(<Page />, { queryClient })
    expect(screen.getByRole("heading", { name: pagesAdminDashboardMessages.metadata.title })).toBeVisible()
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(Math.max(Math.min(count, 5), 1) + 1)
    if (count > 5) {
      expect(screen.getByRole("link", { name: pagesAdminDashboardMessages.users.table.pagination.viewAll })).toHaveAttribute(
        "href",
        "/admin/users",
      )
    } else {
      expect(screen.getByRole("button", { name: pagesAdminDashboardMessages.users.table.pagination.viewAll })).toBeDisabled()
    }
  })
})
