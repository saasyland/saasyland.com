import type * as RouterModule from "@tanstack/react-router"
import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as UsersLayoutRoute } from "~/src/routes/admin.users"
import { Route as UsersRoute } from "~/src/routes/admin.users.all"
import { Route as SecurityRoute } from "~/src/routes/admin.users.security"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { adminQueryClient, breadcrumbDividers, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminBreadcrumbs } from "~/src/presentation/components/custom/admin/admin-breadcrumbs"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"
import { AdminUsersAllPending, AdminUsersSecurityPending } from "~/src/presentation/components/custom/admin/auth-pending"

import navigationAuthMessages from "~/messages/en-US/navigation.auth.json"
import pagesAdminUsersMessages from "~/messages/en-US/pages.admin.users.json"

vi.mock(import("~/src/hooks/use-mobile"), () => ({ useIsMobile: () => false }))
vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<typeof RouterModule>()), Outlet: () => null }))

afterEach(() => vi.restoreAllMocks())

describe("admin users", () => {
  it("shows the security empty state while no records are available", () => {
    renderAdminPage(SecurityRoute.options.component)
    expect(screen.getByText("No data to display")).toBeVisible()
  })

  it("displays an unrecognized role without inventing a translated label", () => {
    const user = Object.assign(adminUser(), { role: "external-role" })
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: [user], total: 1 })
    renderAdminPage(UsersRoute.options.component, { queryClient })
    expect(screen.getByText("external-role")).toBeVisible()
  })

  it.each(["/admin/users/security", "/admin/users"])("links the user subsections from %s", (path) => {
    renderAdminPage(UsersLayoutRoute.options.component, { path })
    expect(screen.getByRole("heading", { name: pagesAdminUsersMessages.title })).toBeVisible()
    expect(screen.getAllByRole("tab").map((link) => link.getAttribute("href"))).toContain("/admin/users/security")
  })
})

describe("admin users skeletons", () => {
  it.each([
    ["/admin/users", AdminPending, AdminUsersAllPending],
    ["/pl-PL/admin/users/all", AdminPending, AdminUsersAllPending],
    ["/admin/users/security", AdminPending, AdminUsersSecurityPending],
    ["/admin/users/all", AdminUsersPending, AdminUsersAllPending],
    ["/ja-JP/admin/users/security", AdminUsersPending, AdminUsersSecurityPending],
    ["/admin/users/security", AdminUsersPending, AdminUsersSecurityPending],
  ])("renders the skeleton of the page at %s", (path, Layout, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<Layout />, { router: createTestRouter(path) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("renders only the layout chrome at /admin/users/unknown", () => {
    const { container } = renderWithRouter(<AdminUsersPending />, { router: createTestRouter("/admin/users/unknown") })

    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each([
    ["/admin/users/all", navigationAuthMessages.userTabs.allUsers],
    ["/admin/users/security", navigationAuthMessages.userTabs.security],
  ])("names the user management sub-page at %s in the breadcrumbs", (path, label) => {
    renderAdminPage(AdminBreadcrumbs, { path })

    expect(screen.getByRole("link", { name: navigationAuthMessages.admin.userManagement })).toHaveAttribute("href", "/admin/users")
    expect(screen.getByText(label)).toHaveAttribute("aria-current", "page")
  })

  it("draws the breadcrumb trail of /pl-PL/admin/users/security", () => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/pl-PL/admin/users/security") })

    expect(breadcrumbDividers(container)).toHaveLength(2)
  })
})
