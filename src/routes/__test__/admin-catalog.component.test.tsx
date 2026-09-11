import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"
import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"
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
    queryClient.setQueryData(getProductsQuery.queryKey, products)
    queryClient.setQueryData(getCategoriesQuery.queryKey, categories)
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
    queryClient.setQueryData(getUsersQuery.queryKey, users)
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
