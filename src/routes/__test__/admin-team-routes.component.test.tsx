import type * as RouterModule from "@tanstack/react-router"
import { fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { Route as UsersLayoutRoute } from "~/src/routes/admin.users"
import { Route as InvitationsRoute } from "~/src/routes/admin.users.invitations"
import { Route as RolesRoute } from "~/src/routes/admin.users.roles"

import { ADMIN_INVITATION_ROWS } from "~/src/data/admin-team"

import { breadcrumbDividers, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminBreadcrumbs } from "~/src/presentation/components/custom/admin/admin-breadcrumbs"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"
import { AdminUsersInvitationsPending, AdminUsersRolesPending } from "~/src/presentation/components/custom/admin/team-pending"

import navigationAuthMessages from "~/messages/en-US/navigation.auth.json"
import navigationTeamMessages from "~/messages/en-US/navigation.team.json"
import pagesAdminUsersInvitationsMessages from "~/messages/en-US/pages.admin.users.invitations.json"
import pagesAdminUsersRolesMessages from "~/messages/en-US/pages.admin.users.roles.json"

vi.mock(import("~/src/hooks/use-mobile"), () => ({ useIsMobile: () => false }))
vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<typeof RouterModule>()), Outlet: () => null }))

afterEach(() => vi.restoreAllMocks())

describe("team invitations and roles", () => {
  it("shows invitation recipients and accepts a search term", () => {
    renderAdminPage(InvitationsRoute.options.component)
    expect(screen.getAllByRole("row")).toHaveLength(ADMIN_INVITATION_ROWS.length + 1)
    const search = screen.getByRole("textbox", { name: pagesAdminUsersInvitationsMessages.search.placeholder })
    fireEvent.change(search, { target: { value: "alex.chen" } })
    expect(search).toHaveValue("alex.chen")
    expect(screen.getAllByRole("row")).toHaveLength(2)
    expect(screen.getByText("alex.chen@example.com")).toBeVisible()
  })

  it("lists roles and their permissions", () => {
    renderAdminPage(RolesRoute.options.component)
    expect(screen.getByRole("heading", { name: pagesAdminUsersRolesMessages.title })).toBeVisible()
    expect(screen.getByRole("table")).toBeVisible()
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1)
  })

  it.each([
    ["/admin/users/invitations", navigationTeamMessages.userTabs.invitations],
    ["/admin/users/roles", navigationTeamMessages.userTabs.roles],
  ])("adds its tab to user management and selects it at %s", (path, label) => {
    renderAdminPage(UsersLayoutRoute.options.component, { path })

    expect(screen.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true")
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toStrictEqual([
      navigationAuthMessages.userTabs.allUsers,
      navigationTeamMessages.userTabs.invitations,
      navigationTeamMessages.userTabs.roles,
      navigationAuthMessages.userTabs.security,
    ])
  })
})

describe("team skeletons", () => {
  it.each([
    ["/admin/users/invitations", AdminPending, AdminUsersInvitationsPending],
    ["/admin/users/roles", AdminPending, AdminUsersRolesPending],
    ["/ja-JP/admin/users/invitations", AdminUsersPending, AdminUsersInvitationsPending],
    ["/admin/users/roles", AdminUsersPending, AdminUsersRolesPending],
  ])("renders the skeleton of the page at %s", (path, Layout, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<Layout />, { router: createTestRouter(path) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it.each([
    ["/admin/users/invitations", navigationTeamMessages.userTabs.invitations],
    ["/admin/users/roles", navigationTeamMessages.userTabs.roles],
  ])("names the team page at %s in the breadcrumbs", (path, label) => {
    renderAdminPage(AdminBreadcrumbs, { path })

    expect(screen.getByRole("link", { name: navigationAuthMessages.admin.userManagement })).toHaveAttribute("href", "/admin/users")
    expect(screen.getByText(label)).toHaveAttribute("aria-current", "page")
  })

  it("draws the breadcrumb trail of /pl-PL/admin/users/roles", () => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/pl-PL/admin/users/roles") })

    expect(breadcrumbDividers(container)).toHaveLength(2)
  })
})
