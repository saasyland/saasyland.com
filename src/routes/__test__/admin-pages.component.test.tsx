import type { ComponentType } from "react"

import { fireEvent, screen } from "@testing-library/react"
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

import { adminMessages, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"

const renderPage = (Page: ComponentType | undefined) => {
  if (!Page) {
    throw new Error("The route must provide a page")
  }
  return renderAdmin(<Page />)
}

afterEach(() => vi.restoreAllMocks())

describe("admin content and reporting pages", () => {
  it.each([
    [AnalyticsRoute, adminMessages.pages.admin.analytics.title],
    [BlogCreateRoute, adminMessages.pages.admin.blog.create.title],
    [CourseCreateRoute, adminMessages.pages.admin.courses.create.title],
    [LandingRoute, adminMessages.pages.admin["landing-page"].title],
    [PaymentsRoute, adminMessages.pages.admin.payments.title],
    [PricingRoute, adminMessages.pages.admin["pricing-models"].title],
    [ProductCreateRoute, adminMessages.pages.admin.products.create.title],
  ] as const)("renders its translated title and controls: %s", (route, title) => {
    renderPage(route.options.component)
    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
  })

  it.each(["grid", "table"] as const)("presents blog posts in the requested %s view", (view) => {
    vi.spyOn(BlogRoute, "useSearch").mockReturnValue({ view })
    renderPage(BlogRoute.options.component)
    expect(screen.getByRole("heading", { name: adminMessages.pages.admin.blog.title })).toBeVisible()
    expect(screen.getByRole("link", { name: adminMessages.pages.admin.blog.actions.writePost })).toHaveAttribute(
      "href",
      "/admin/blog/create",
    )
    if (view === "table") {
      expect(screen.getByRole("table")).toBeVisible()
    } else {
      expect(screen.getByRole("button", { name: adminMessages.pages.admin.blog.actions.loadMore })).toBeVisible()
    }
  })

  it("shows the refund details when the refunds tab is selected", async () => {
    renderPage(PaymentsRoute.options.component)
    await userEvent.click(screen.getByRole("tab", { name: adminMessages.pages.admin.payments.tabs.refunds }))
    expect(screen.getByRole("table")).toBeVisible()
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1)
  })

  it("shows invitation recipients and accepts a search term", () => {
    renderPage(InvitationsRoute.options.component)
    const search = screen.getByRole("textbox", { name: adminMessages.pages.admin.users.invitations.search.placeholder })
    fireEvent.change(search, { target: { value: "ada@example.com" } })
    expect(search).toHaveValue("ada@example.com")
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1)
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
