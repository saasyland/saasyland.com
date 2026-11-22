import type * as RouterModule from "@tanstack/react-router"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { Route as AdminRoute } from "~/src/routes/admin"
import { Route as SettingsRoute } from "~/src/routes/admin.settings"

import { SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

import {
  adminQueryClient,
  breadcrumbDividers,
  renderAdmin,
  renderAdminPage,
} from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminBreadcrumbs } from "~/src/presentation/components/custom/admin/admin-breadcrumbs"
import { UserWidget } from "~/src/presentation/components/custom/admin/user-widget"

import preferencesCardMessages from "~/messages/en-US/components.custom.preferences-card.json"
import navigationAuthMessages from "~/messages/en-US/navigation.auth.json"
import navigationCoursesMessages from "~/messages/en-US/navigation.courses.json"
import pagesAdminMessages from "~/messages/en-US/pages.admin.json"
import pagesAdminSettingsMessages from "~/messages/en-US/pages.admin.settings.json"
import timezonesMessages from "~/messages/en-US/timezones.json"
import { APP_NAME } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

vi.mock(import("~/src/hooks/use-mobile"), () => ({ useIsMobile: () => false }))
vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<typeof RouterModule>()), Outlet: () => null }))

afterEach(() => vi.restoreAllMocks())

describe("admin navigation", () => {
  it.each(["/admin", "/admin/unknown"])("renders breadcrumbs and navigation for %s", (path) => {
    renderAdminPage(AdminRoute.options.component, { path })
    expect(screen.getAllByRole("link", { name: navigationAuthMessages.admin.dashboard }).length).toBeGreaterThan(0)
    expect(screen.getByRole("navigation", { name: pagesAdminMessages.components.breadcrumbs.home })).toBeVisible()
  })

  it.each(["/admin", "/admin/orders"])("links the wordmark to the home page from %s", (path) => {
    renderAdminPage(AdminRoute.options.component, { path })

    expect(screen.getByRole("link", { name: APP_NAME })).toHaveAttribute("href", ROUTES.HOME)
  })

  it("leaves a sub-page out of the breadcrumbs when its area does not name it", () => {
    const { container } = renderAdmin(<AdminBreadcrumbs />, { path: "/admin/settings/unknown" })

    expect(screen.getByRole("link", { name: navigationAuthMessages.admin.settings })).toHaveAttribute("href", "/admin/settings")
    expect(breadcrumbDividers(container)).toHaveLength(1)
    expect(container.querySelector('[aria-current="page"]')).toBeNull()
  })

  it("names a sub-page in the breadcrumbs when its area does", () => {
    const { container } = renderAdmin(<AdminBreadcrumbs />, { path: "/admin/courses/create" })

    expect(screen.getByRole("link", { name: navigationCoursesMessages.admin.courses })).toHaveAttribute("href", "/admin/courses")
    expect(screen.getByText(navigationCoursesMessages.breadcrumbs.create)).toHaveAttribute("aria-current", "page")
    expect(breadcrumbDividers(container)).toHaveLength(2)
  })

  it.each(["/", "/app"])("does not show admin breadcrumbs outside admin at %s", (path) => {
    const { container } = renderAdmin(<AdminBreadcrumbs />, { path })
    expect(container).toBeEmptyDOMElement()
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
    renderAdminPage(SettingsRoute.options.component, { queryClient })
    expect(screen.getByRole("combobox", { name: preferencesCardMessages.timezone.label })).toHaveValue(timezonesMessages.UTC)
    await userEvent.click(screen.getByRole("tab", { name: pagesAdminSettingsMessages.tabs.security }))
    expect(screen.getByRole("button", { name: pagesAdminSettingsMessages.security.twoFactor.enable })).toBeVisible()
    expect(screen.getByRole("heading", { name: pagesAdminSettingsMessages.security.sessions.title })).toBeVisible()
    expect(screen.getByLabelText(pagesAdminSettingsMessages.security.password.current)).toHaveValue("")
  })

  it("shows only the admin's own saved time zone, with no unconnected workspace controls", () => {
    renderAdminPage(SettingsRoute.options.component)
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByRole("button", { name: /delete/iu })).toBeNull()
    expect(screen.getByRole("heading", { name: preferencesCardMessages.title })).toBeVisible()
    expect(screen.getByRole("combobox", { name: preferencesCardMessages.timezone.label })).toHaveValue(timezonesMessages["Europe/Warsaw"])
    expect(screen.queryByRole("switch")).toBeNull()
  })
})
