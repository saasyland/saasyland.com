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
  adminMessages,
  adminProduct,
  adminQueryClient,
  adminUser,
  renderAdmin,
} from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { ProductsPagination } from "~/src/presentation/components/custom/admin/products/components/products-pagination"
import { ProductsTabToolbar } from "~/src/presentation/components/custom/admin/products/components/products-tab-toolbar"
import { ProductsTaggedRow } from "~/src/presentation/components/custom/admin/products/components/products-tagged-row"
import { resolveProductTab } from "~/src/presentation/components/custom/admin/products/constants/product-tabs"

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

afterEach(() => vi.restoreAllMocks())

describe("admin catalog", () => {
  it.each([0, 5])("shows a static preview range for %i rows without enabling navigation", (end) => {
    renderAdmin(<ProductsPagination end={end} total={end} />)
    expect(screen.getByRole("button", { name: adminMessages.pages.admin.labels.previousPage })).toBeDisabled()
    expect(screen.getByRole("button", { name: adminMessages.pages.admin.labels.nextPage })).toBeDisabled()
    expect(screen.getByText(`Showing ${end === 0 ? 0 : 1} to ${end} of ${end} products`)).toBeVisible()
  })

  it("navigates between server pages and disables navigation at the boundaries", async () => {
    vi.spyOn(ProductsRoute, "useSearch").mockReturnValue({})
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
    expect(screen.getByRole("button", { name: adminMessages.pages.admin.labels.previousPage })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: adminMessages.pages.admin.labels.nextPage }))
    expect(await screen.findByText("Last product")).toBeVisible()
    expect(screen.getByRole("button", { name: adminMessages.pages.admin.labels.nextPage })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: adminMessages.pages.admin.labels.previousPage }))
    expect(await screen.findByText("Item 0")).toBeVisible()
  })

  it.each([
    ["all", "Starter Kit"],
    ["drafts", "Monthly subscription"],
    ["onetime", "Starter Kit"],
    ["subscriptions", "Monthly subscription"],
    ["categories", "Private category"],
    ["collections", "Starter collection"],
    ["courses", adminMessages.pages.admin.labels.noCourses],
  ])("renders the requested %s product panel", (tab, expected) => {
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
    expect(screen.getByRole("heading", { name: adminMessages.pages.admin.products.title })).toBeVisible()
    expect(screen.getByText(expected)).toBeVisible()
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

  it.each([undefined, "invalid", ["all"]])("defaults unsupported tab values to the complete catalog: %s", (tab) => {
    expect(resolveProductTab(tab)).toBe("all")
  })

  it("hides optional catalog filters without hiding search or creation", () => {
    renderAdmin(<ProductsTabToolbar showStatusFilter={false} showTypeFilter={false} />)
    expect(screen.queryByRole("button", { name: adminMessages.pages.admin.products.filters.status })).not.toBeInTheDocument()
    expect(screen.getByRole("textbox")).toBeVisible()
    expect(screen.getByRole("link")).toHaveAttribute("href", "/admin/products/create")
  })

  it.each([null, "", "month"])("displays tagged billing information consistently for %s", (billingCycle) => {
    renderAdmin(
      <table>
        <tbody>
          <ProductsTaggedRow product={adminProduct({ billingCycle })} />
        </tbody>
      </table>,
    )
    expect(screen.getByRole("row")).toHaveTextContent("Starter Kit")
    expect(screen.getByRole("row")).toHaveTextContent(billingCycle === "month" ? "/ month" : "4900 USD")
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
    expect(screen.getByRole("heading", { name: adminMessages.pages.admin.dashboard.title })).toBeVisible()
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(Math.min(count, 5) + 1)
    if (count > 5) {
      expect(screen.getByRole("link", { name: adminMessages.pages.admin.dashboard.users.table.pagination.viewAll })).toHaveAttribute(
        "href",
        "/admin/users",
      )
    } else {
      expect(screen.getByRole("button", { name: adminMessages.pages.admin.dashboard.users.table.pagination.viewAll })).toBeDisabled()
    }
  })
})
