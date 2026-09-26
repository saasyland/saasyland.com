import type * as RouterModule from "@tanstack/react-router"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { Route as AdminRoute } from "~/src/routes/admin"
import { Route as SettingsRoute } from "~/src/routes/admin.settings"
import { Route as UsersRoute } from "~/src/routes/admin.users"

import { SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminBreadcrumbs } from "~/src/presentation/components/custom/admin/admin-breadcrumbs"
import { UserWidget } from "~/src/presentation/components/custom/admin/user-widget"

import pagesAdminMessages from "~/messages/en-US/pages.admin.json"
import pagesAdminSettingsMessages from "~/messages/en-US/pages.admin.settings.json"
import pagesAdminSidebarMessages from "~/messages/en-US/pages.admin.sidebar.json"
import pagesAdminUsersMessages from "~/messages/en-US/pages.admin.users.json"

vi.mock(import("~/src/hooks/use-mobile"), () => ({ useIsMobile: () => false }))
vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<typeof RouterModule>()), Outlet: () => null }))

afterEach(() => vi.restoreAllMocks())

describe("admin navigation", () => {
  it.each(["/admin", "/admin/analytics", "/admin/blog/create", "/admin/unknown"])("renders breadcrumbs and navigation for %s", (path) => {
    const Page = AdminRoute.options.component
    if (!Page) {
      throw new Error("Missing admin layout")
    }
    renderAdmin(<Page />, { path })
    expect(screen.getAllByRole("link", { name: pagesAdminSidebarMessages.links.dashboard }).length).toBeGreaterThan(0)
    expect(screen.getByRole("navigation", { name: pagesAdminMessages.components.breadcrumbs.home })).toBeVisible()
    if (path.endsWith("create")) {
      expect(screen.getByText(pagesAdminMessages.components.breadcrumbs.actions.create)).toBeVisible()
    }
  })

  it.each(["/", "/app"])("does not show admin breadcrumbs outside admin at %s", (path) => {
    const { container } = renderAdmin(<AdminBreadcrumbs />, { path })
    expect(container).toBeEmptyDOMElement()
  })

  it.each(["/admin/users/invitations", "/admin/users"])("links the user subsections from %s", (path) => {
    const Page = UsersRoute.options.component
    if (!Page) {
      throw new Error("Missing users layout")
    }
    renderAdmin(<Page />, { path })
    expect(screen.getByRole("heading", { name: pagesAdminUsersMessages.title })).toBeVisible()
    expect(screen.getAllByRole("tab").map((link) => link.getAttribute("href"))).toContain("/admin/users/invitations")
  })

  it("opens settings from the account menu", async () => {
    const result = renderAdmin(
      <SidebarProvider>
        <UserWidget />
      </SidebarProvider>,
    )
    const navigate = vi.spyOn(result.router, "navigate").mockResolvedValue()
    await userEvent.click(screen.getByRole("button", { name: /Test User/u }))
    await userEvent.click(screen.getByRole("menuitem", { name: pagesAdminMessages.components.userWidget.settings }))
    expect(navigate).toHaveBeenCalledWith({ to: "/admin/settings" })
  })

  it("uses the email address when the signed-in user has no display name", () => {
    const queryClient = adminQueryClient()
    const session = queryClient.getQueryData(getCurrentSessionQuery.queryKey)
    if (!session) {
      throw new Error("Missing fixture session")
    }
    session.user.name = ""
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
    renderAdmin(
      <SidebarProvider>
        <UserWidget />
      </SidebarProvider>,
      { queryClient },
    )
    expect(screen.getByRole("button", { name: new RegExp(session.user.email, "u") })).toBeVisible()
  })

  it("hides account details after the session ends", () => {
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, null)
    const { container } = renderAdmin(<UserWidget />, { queryClient })
    expect(container).toBeEmptyDOMElement()
  })
})

describe("general workspace settings", () => {
  it("renders security controls safely when the current session is unavailable", async () => {
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, null)
    const Page = SettingsRoute.options.component
    if (!Page) {
      throw new Error("Missing settings page")
    }
    renderAdmin(<Page />, { queryClient })
    await userEvent.click(screen.getByRole("tab", { name: pagesAdminSettingsMessages.tabs.security }))
    expect(screen.getByRole("button", { name: pagesAdminSettingsMessages.security.twoFactor.enable })).toBeVisible()
    expect(screen.getByRole("heading", { name: pagesAdminSettingsMessages.security.sessions.title })).toBeVisible()
    expect(screen.getByLabelText(pagesAdminSettingsMessages.security.password.current)).toHaveValue("")
  })

  it("shows workspace fields and allows announcement preferences to change", async () => {
    const Page = SettingsRoute.options.component
    if (!Page) {
      throw new Error("Missing settings page")
    }
    renderAdmin(<Page />)
    expect(screen.getByDisplayValue("SaaSy Land")).toBeVisible()
    expect(screen.getByDisplayValue("support@saasyland.com")).toBeVisible()
    const announcements = screen.getByRole("switch")
    expect(announcements).toBeChecked()
    await userEvent.click(announcements)
    expect(announcements).not.toBeChecked()
  })
})
