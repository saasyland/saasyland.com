import type * as RouterModule from "@tanstack/react-router"
import { fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as UsersLayoutRoute } from "~/src/routes/admin.users"
import { Route as UsersRoute } from "~/src/routes/admin.users.all"
import { Route as InvitationsRoute } from "~/src/routes/admin.users.invitations"
import { Route as RolesRoute } from "~/src/routes/admin.users.roles"
import { Route as SecurityRoute } from "~/src/routes/admin.users.security"

import { ADMIN_INVITATION_ROWS } from "~/src/data/admin"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { adminQueryClient, breadcrumbDividers, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import {
  AdminUsersAllPending,
  AdminUsersInvitationsPending,
  AdminUsersPending,
  AdminUsersRolesPending,
  AdminUsersSecurityPending,
} from "~/src/presentation/components/custom/admin/administration-pending"

import pagesAdminUsersMessages from "~/messages/en-US/pages.admin.users.json"

vi.mock(import("~/src/hooks/use-mobile"), () => ({ useIsMobile: () => false }))
vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<typeof RouterModule>()), Outlet: () => null }))

afterEach(() => vi.restoreAllMocks())

describe("admin users", () => {
  it("shows invitation recipients and accepts a search term", () => {
    renderAdminPage(InvitationsRoute.options.component)
    expect(screen.getAllByRole("row")).toHaveLength(ADMIN_INVITATION_ROWS.length + 1)
    const search = screen.getByRole("textbox", { name: pagesAdminUsersMessages.invitations.search.placeholder })
    fireEvent.change(search, { target: { value: "alex.chen" } })
    expect(search).toHaveValue("alex.chen")
    expect(screen.getAllByRole("row")).toHaveLength(2)
    expect(screen.getByText("alex.chen@example.com")).toBeVisible()
  })

  it("lists roles and their permissions", () => {
    renderAdminPage(RolesRoute.options.component)
    expect(screen.getByRole("table")).toBeVisible()
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1)
  })

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

  it.each(["/admin/users/invitations", "/admin/users"])("links the user subsections from %s", (path) => {
    renderAdminPage(UsersLayoutRoute.options.component, { path })
    expect(screen.getByRole("heading", { name: pagesAdminUsersMessages.title })).toBeVisible()
    expect(screen.getAllByRole("tab").map((link) => link.getAttribute("href"))).toContain("/admin/users/invitations")
  })
})

describe("admin users skeletons", () => {
  it.each([
    ["/admin/users", AdminPending, AdminUsersAllPending],
    ["/pl-PL/admin/users/all", AdminPending, AdminUsersAllPending],
    ["/admin/users/invitations", AdminPending, AdminUsersInvitationsPending],
    ["/admin/users/roles", AdminPending, AdminUsersRolesPending],
    ["/admin/users/security", AdminPending, AdminUsersSecurityPending],
    ["/admin/users/all", AdminUsersPending, AdminUsersAllPending],
    ["/ja-JP/admin/users/invitations", AdminUsersPending, AdminUsersInvitationsPending],
    ["/admin/users/roles", AdminUsersPending, AdminUsersRolesPending],
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

  it("draws the breadcrumb trail of /pl-PL/admin/users/roles", () => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/pl-PL/admin/users/roles") })

    expect(breadcrumbDividers(container)).toHaveLength(2)
  })
})
