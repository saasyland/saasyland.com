import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as DashboardRoute } from "~/src/routes/admin.index"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { adminMessages, adminQueryClient, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminDashboardPending } from "~/src/presentation/components/custom/admin/overview-pending"

import pagesAdminDashboardMessages from "~/messages/en-US/pages.admin.dashboard.json"

afterEach(() => vi.restoreAllMocks())

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
    queryClient.setQueryData(getUsersQuery.queryKey, {
      rows: users,
      total: users.length,
      pendingVerification: users.filter((row) => !row.emailVerified && !row.banned).length,
    })
    renderAdminPage(DashboardRoute.options.component, { queryClient })
    expect(screen.getByRole("heading", { name: pagesAdminDashboardMessages.metadata.title })).toBeVisible()
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(Math.max(Math.min(count, 5), 1) + 1)
    if (count > 5) {
      expect(screen.getByRole("link", { name: pagesAdminDashboardMessages.users.table.pagination.viewAll })).toHaveAttribute(
        "href",
        "/admin/users",
      )
    } else {
      expect(screen.getByRole("button", { name: pagesAdminDashboardMessages.users.table.pagination.viewAll })).toBeDisabled()
    }
  })

  it("shows a dashboard user's identity, avatar and last activity date", () => {
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getUsersQuery.queryKey, {
      pendingVerification: 0,
      rows: [adminUser(), adminUser({ id: "grace", image: "https://example.com/grace.png", name: "Grace Hopper" })],
      total: 2,
    })
    renderAdminPage(DashboardRoute.options.component, { queryClient })
    const [, adaRow] = within(screen.getByRole("table")).getAllByRole("row")
    if (!adaRow) {
      throw new Error("Missing dashboard row")
    }
    expect(adaRow).toHaveTextContent("Ada Lovelace")
    expect(adaRow).toHaveTextContent("ada@example.com")
    expect(adaRow).toHaveTextContent("Jan 1, 2025")
    expect(adaRow).toHaveTextContent("AL")
  })

  it("replaces the route's pending UI when the dashboard loader finishes", async () => {
    vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {})
    const pending = Promise.withResolvers<{ rows: ReturnType<typeof adminUser>[]; total: number; pendingVerification: number }>()
    vi.spyOn(getUsersQuery, "queryFn").mockReturnValue(pending.promise)
    const queryClient = adminQueryClient()
    queryClient.removeQueries({ queryKey: getUsersQuery.queryKey })
    const Page = DashboardRoute.options.component
    if (!Page) {
      throw new Error("Missing dashboard page")
    }
    const root = createRootRoute({
      component: () => (
        <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={adminMessages} timeZone={I18N.DEFAULT_TIMEZONE}>
          <Outlet />
        </IntlProvider>
      ),
    })
    const dashboard = createRoute({
      component: Page,
      getParentRoute: () => root,
      loader: () => queryClient.query(getUsersQuery),
      path: "/admin",
      pendingComponent: AdminDashboardPending,
    })
    const router = createRouter({
      defaultPendingMinMs: 0,
      defaultPendingMs: 0,
      history: createMemoryHistory({ initialEntries: ["/admin"] }),
      routeTree: root.addChildren([dashboard]),
    })
    setupRouterSsrQueryIntegration({ queryClient, router })
    const { container } = render(<RouterProvider router={router} />)
    await waitFor(() => {
      expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    })
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    await act(async () => {
      pending.resolve({ pendingVerification: 0, rows: [adminUser()], total: 1 })
      await pending.promise
    })
    expect(await screen.findByText("Ada Lovelace")).toBeVisible()
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
  })
})
