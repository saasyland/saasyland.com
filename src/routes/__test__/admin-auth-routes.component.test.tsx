import type * as RouterModule from "@tanstack/react-router"
import { screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as UsersLayoutRoute } from "~/src/routes/admin.users"
import { Route as UsersRoute } from "~/src/routes/admin.users.all"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { adminQueryClient, breadcrumbDividers, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminBreadcrumbs } from "~/src/presentation/components/custom/admin/admin-breadcrumbs"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"
import {
  AdminUserProfilePending,
  AdminUsersAllPending,
  AdminUsersInvitationsPending,
} from "~/src/presentation/components/custom/admin/auth-pending"

import navigationAuthMessages from "~/messages/en-US/navigation.auth.json"
import pagesAdminUsersMessages from "~/messages/en-US/pages.admin.users.json"
import { routeTree } from "~/src/routeTree.gen"

vi.mock(import("~/src/hooks/use-mobile"), () => ({ useIsMobile: () => false }))
vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<typeof RouterModule>()), Outlet: () => null }))

afterEach(() => vi.restoreAllMocks())

describe("admin users", () => {
  it("displays an unrecognized role without inventing a translated label", () => {
    const user = Object.assign(adminUser(), { role: "external-role" })
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: [user], total: 1 })
    renderAdminPage(UsersRoute.options.component, { queryClient })
    expect(screen.getByText("external-role")).toBeVisible()
  })

  it.each(["/admin/users/all", "/admin/users", "/admin/users/ada"])("selects the users tab from %s", (path) => {
    renderAdminPage(UsersLayoutRoute.options.component, { path })
    expect(screen.getByRole("heading", { name: pagesAdminUsersMessages.title })).toBeVisible()
    expect(screen.getByRole("tab", { name: navigationAuthMessages.userTabs.allUsers })).toHaveAttribute("aria-selected", "true")
    expect(screen.getAllByRole("tab").map((link) => link.getAttribute("href"))).toContain("/admin/users/all")
  })

  it("loads a users tab's page when the pointer rests on it or it takes focus", async () => {
    const { router } = renderAdminPage(UsersLayoutRoute.options.component, { path: "/admin/users/all" })
    const preloadRoute = vi.spyOn(router, "preloadRoute").mockResolvedValue(undefined)
    const user = userEvent.setup({ delay: null })
    const allUsers = screen.getByRole("tab", { name: navigationAuthMessages.userTabs.allUsers })

    await user.hover(allUsers)
    allUsers.focus()

    expect(preloadRoute).toHaveBeenNthCalledWith(1, { to: "/admin/users/all" })
    expect(preloadRoute).toHaveBeenNthCalledWith(2, { to: "/admin/users/all" })
  })

  it("selects the invitations tab from /admin/users/invitations", () => {
    renderAdminPage(UsersLayoutRoute.options.component, { path: "/admin/users/invitations" })

    expect(screen.getByRole("tab", { name: navigationAuthMessages.userTabs.invitations })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: navigationAuthMessages.userTabs.allUsers })).toHaveAttribute("aria-selected", "false")
  })
})

describe("admin users skeletons", () => {
  it.each([
    ["/admin/users", AdminPending, AdminUsersAllPending],
    ["/pl-PL/admin/users/all", AdminPending, AdminUsersAllPending],
    ["/admin/users/all", AdminUsersPending, AdminUsersAllPending],
    ["/ja-JP/admin/users/ada", AdminUsersPending, AdminUserProfilePending],
    ["/admin/users/ada", AdminUsersPending, AdminUserProfilePending],
    ["/admin/users/invitations", AdminPending, AdminUsersInvitationsPending],
    ["/de-DE/admin/users/invitations", AdminUsersPending, AdminUsersInvitationsPending],
  ])("renders the skeleton of the page at %s", (path, Layout, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<Layout />, { router: createTestRouter(path, routeTree) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("names the user management sub-page at /admin/users/all in the breadcrumbs", () => {
    renderAdminPage(AdminBreadcrumbs, { path: "/admin/users/all" })

    expect(screen.getByRole("link", { name: navigationAuthMessages.admin.userManagement })).toHaveAttribute("href", "/admin/users")
    expect(screen.getByText(navigationAuthMessages.userTabs.allUsers)).toHaveAttribute("aria-current", "page")
  })

  it("draws the breadcrumb trail of /pl-PL/admin/users/all", () => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/pl-PL/admin/users/all", routeTree) })

    expect(breadcrumbDividers(container)).toHaveLength(2)
  })
})
