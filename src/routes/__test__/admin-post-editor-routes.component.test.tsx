import type * as RouterModule from "@tanstack/react-router"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { Route as AdminRoute } from "~/src/routes/admin"
import { Route as BlogCreateRoute } from "~/src/routes/admin.blog.create"
import { Route as BlogRoute } from "~/src/routes/admin.blog.index"

import { renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminBlogCreatePending, AdminBlogPending } from "~/src/presentation/components/custom/admin/content-pending"

import pagesAdminBlogCreateMessages from "~/messages/en-US/pages.admin.blog.create.json"
import pagesAdminBlogMessages from "~/messages/en-US/pages.admin.blog.json"
import pagesAdminMessages from "~/messages/en-US/pages.admin.json"
import pagesAdminSidebarMessages from "~/messages/en-US/pages.admin.sidebar.json"

vi.mock(import("~/src/hooks/use-mobile"), () => ({ useIsMobile: () => false }))
vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<typeof RouterModule>()), Outlet: () => null }))

const firstBodyRow = () => within(screen.getAllByRole("row")[1]!)

afterEach(() => vi.restoreAllMocks())

describe("admin post editor", () => {
  it("renders the post editor with its translated title and controls", () => {
    renderAdminPage(BlogCreateRoute.options.component)
    expect(screen.getByRole("heading", { name: pagesAdminBlogCreateMessages.metadata.title })).toBeVisible()
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
  })

  it.each(["grid", "table"] as const)("presents blog posts in the requested %s view", (view) => {
    vi.spyOn(BlogRoute, "useSearch").mockReturnValue({ view })
    renderAdminPage(BlogRoute.options.component)
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
    renderAdminPage(BlogRoute.options.component)
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

  it("renders breadcrumbs and navigation for /admin/blog/create", () => {
    renderAdminPage(AdminRoute.options.component, { path: "/admin/blog/create" })
    expect(screen.getAllByRole("link", { name: pagesAdminSidebarMessages.links.dashboard }).length).toBeGreaterThan(0)
    expect(screen.getByRole("navigation", { name: pagesAdminMessages.components.breadcrumbs.home })).toBeVisible()
    expect(screen.getByText(pagesAdminMessages.components.breadcrumbs.actions.create)).toBeVisible()
  })

  it.each([
    ["/admin/blog", AdminBlogPending],
    ["/admin/blog/create", AdminBlogCreatePending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter(path) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})
