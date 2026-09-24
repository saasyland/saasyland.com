import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as DashboardRoute } from "~/src/routes/admin.index"
import { Route as UsersRoute } from "~/src/routes/admin.users.all"

import { ADMIN_ANALYTICS_REGION_ROWS } from "~/src/data/admin"

import { adminMessages, adminQueryClient, adminUser, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { useDemoAnalytics } from "~/src/presentation/components/custom/admin/analytics/hooks/use-demo-analytics"
import { DashboardUsersTableRow } from "~/src/presentation/components/custom/admin/dashboard/components/dashboard-users-table-row"
import { DefaultPending } from "~/src/presentation/components/custom/default-pending"

afterEach(() => vi.restoreAllMocks())

describe("admin data display fallbacks", () => {
  it("keeps unfamiliar region codes visible when Intl has no display name", () => {
    vi.spyOn(Intl.DisplayNames.prototype, "of").mockReturnValue(undefined)
    const { result } = renderHook(useDemoAnalytics, {
      wrapper: ({ children }) => (
        <IntlProvider locale="en-US" messages={adminMessages}>
          {children}
        </IntlProvider>
      ),
    })
    expect(result.current.regions.map((region) => region.name)).toEqual(ADMIN_ANALYTICS_REGION_ROWS.map((region) => region.code))
  })

  it("shows a dashboard user's identity when no initials are supplied", () => {
    renderAdmin(
      <table>
        <tbody>
          <DashboardUsersTableRow
            row={{ email: "ada@example.com", id: "ada", lastActive: "2025-01-01", name: "Ada", role: "customer", status: "active" }}
          />
        </tbody>
      </table>,
    )
    expect(screen.getByRole("row")).toHaveTextContent("Ada")
    expect(screen.getByRole("row")).toHaveTextContent("ada@example.com")
  })

  it("displays an unrecognized role without inventing a translated label", () => {
    const user = Object.assign(adminUser(), { role: "external-role" })
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: [user], total: 1 })
    const Page = UsersRoute.options.component
    if (!Page) {
      throw new Error("Missing users page")
    }
    renderAdmin(<Page />, { queryClient })
    expect(screen.getByText("external-role")).toBeVisible()
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
        <IntlProvider locale="en-US" messages={adminMessages}>
          <Outlet />
        </IntlProvider>
      ),
    })
    const dashboard = createRoute({
      component: Page,
      getParentRoute: () => root,
      loader: () => queryClient.query(getUsersQuery),
      path: "/admin",
    })
    const router = createRouter({
      defaultPendingComponent: DefaultPending,
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
