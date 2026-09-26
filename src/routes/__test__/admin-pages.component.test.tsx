import type { ComponentType } from "react"

import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { Route as AnalyticsRoute } from "~/src/routes/admin.analytics"
import { Route as BlogCreateRoute } from "~/src/routes/admin.blog.create"
import { Route as BlogRoute } from "~/src/routes/admin.blog.index"
import { Route as CourseCreateRoute } from "~/src/routes/admin.courses.create"
import { Route as LandingRoute } from "~/src/routes/admin.landing-page"
import { Route as PaymentsRoute } from "~/src/routes/admin.payments"
import { Route as PricingRoute } from "~/src/routes/admin.pricing-models"
import { Route as ProductCreateRoute } from "~/src/routes/admin.products.create"
import { Route as InvitationsRoute } from "~/src/routes/admin.users.invitations"
import { Route as RolesRoute } from "~/src/routes/admin.users.roles"
import { Route as SecurityRoute } from "~/src/routes/admin.users.security"

import { ADMIN_INVITATION_ROWS } from "~/src/data/admin"

import { renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"

import pagesAdminAnalyticsMessages from "~/messages/en-US/pages.admin.analytics.json"
import pagesAdminBlogCreateMessages from "~/messages/en-US/pages.admin.blog.create.json"
import pagesAdminBlogMessages from "~/messages/en-US/pages.admin.blog.json"
import pagesAdminCoursesCreateMessages from "~/messages/en-US/pages.admin.courses.create.json"
import pagesAdminLandingPageMessages from "~/messages/en-US/pages.admin.landing-page.json"
import pagesAdminPaymentsMessages from "~/messages/en-US/pages.admin.payments.json"
import pagesAdminPricingModelsMessages from "~/messages/en-US/pages.admin.pricing-models.json"
import pagesAdminProductsCreateMessages from "~/messages/en-US/pages.admin.products.create.json"
import pagesAdminUsersMessages from "~/messages/en-US/pages.admin.users.json"

const renderPage = (Page: ComponentType | undefined) => {
  if (!Page) {
    throw new Error("The route must provide a page")
  }
  return renderAdmin(<Page />)
}

const firstBodyRow = () => within(screen.getAllByRole("row")[1]!)

afterEach(() => vi.restoreAllMocks())

describe("admin content and reporting pages", () => {
  it.each([
    [AnalyticsRoute, pagesAdminAnalyticsMessages.title],
    [BlogCreateRoute, pagesAdminBlogCreateMessages.metadata.title],
    [CourseCreateRoute, pagesAdminCoursesCreateMessages.metadata.title],
    [LandingRoute, pagesAdminLandingPageMessages.metadata.title],
    [PaymentsRoute, pagesAdminPaymentsMessages.title],
    [PricingRoute, pagesAdminPricingModelsMessages.metadata.title],
    [ProductCreateRoute, pagesAdminProductsCreateMessages.metadata.title],
  ] as const)("renders its translated title and controls: %s", (route, title) => {
    renderPage(route.options.component)
    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
  })

  it.each(["grid", "table"] as const)("presents blog posts in the requested %s view", (view) => {
    vi.spyOn(BlogRoute, "useSearch").mockReturnValue({ view })
    renderPage(BlogRoute.options.component)
    expect(screen.getByRole("heading", { name: pagesAdminBlogMessages.metadata.title })).toBeVisible()
    expect(screen.getByRole("link", { name: pagesAdminBlogMessages.actions.writePost })).toHaveAttribute("href", "/admin/blog/create")
    if (view === "table") {
      expect(screen.getByRole("table")).toBeVisible()
    } else {
      expect(screen.getByRole("button", { name: pagesAdminBlogMessages.actions.loadMore })).toBeVisible()
    }
  })

  it("sorts the blog post table by author name", async () => {
    vi.spyOn(BlogRoute, "useSearch").mockReturnValue({ view: "table" })
    renderPage(BlogRoute.options.component)
    const author = screen.getByRole("columnheader", { name: pagesAdminBlogMessages.table.author })

    expect(firstBodyRow().getByText("Marta Kowalczyk")).toBeVisible()
    expect(firstBodyRow().getByText("MK")).toBeInTheDocument()

    await userEvent.click(within(author).getByRole("button"))
    expect(author).toHaveAttribute("aria-sort", "ascending")
    expect(firstBodyRow().getByText("Dele Okonkwo")).toBeVisible()

    await userEvent.click(within(author).getByRole("button"))
    expect(author).toHaveAttribute("aria-sort", "descending")
    expect(firstBodyRow().getByText("Rafael Santos")).toBeVisible()
    expect(firstBodyRow().getByText("RS")).toBeInTheDocument()
  })

  it("shows the refund details when the refunds tab is selected", async () => {
    renderPage(PaymentsRoute.options.component)
    await userEvent.click(screen.getByRole("tab", { name: pagesAdminPaymentsMessages.tabs.refunds }))
    expect(screen.getByRole("table")).toBeVisible()
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1)
  })

  it("shows invitation recipients and accepts a search term", () => {
    renderPage(InvitationsRoute.options.component)
    expect(screen.getAllByRole("row")).toHaveLength(ADMIN_INVITATION_ROWS.length + 1)
    const search = screen.getByRole("textbox", { name: pagesAdminUsersMessages.invitations.search.placeholder })
    fireEvent.change(search, { target: { value: "alex.chen" } })
    expect(search).toHaveValue("alex.chen")
    expect(screen.getAllByRole("row")).toHaveLength(2)
    expect(screen.getByText("alex.chen@example.com")).toBeVisible()
  })

  it("lists roles and their permissions", () => {
    renderPage(RolesRoute.options.component)
    expect(screen.getByRole("table")).toBeVisible()
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1)
  })

  it("shows the security empty state while no records are available", () => {
    renderPage(SecurityRoute.options.component)
    expect(screen.getByText("No data to display")).toBeVisible()
  })
})
