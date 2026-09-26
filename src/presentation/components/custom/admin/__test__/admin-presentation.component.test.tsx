import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as AnalyticsRoute } from "~/src/routes/admin.analytics"
import { Route as DashboardRoute } from "~/src/routes/admin.index"
import { Route as UsersRoute } from "~/src/routes/admin.users.all"

import { ADMIN_ANALYTICS_REGION_ROWS } from "~/src/data/admin"

import { adminMessages, adminQueryClient, adminUser, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminDashboardPending } from "~/src/presentation/components/custom/admin/overview-pending"

afterEach(() => vi.restoreAllMocks())

describe("admin data display fallbacks", () => {
  it("keeps unfamiliar region codes visible when Intl has no display name", () => {
    vi.spyOn(Intl.DisplayNames.prototype, "of").mockReturnValue(undefined)
    const Page = AnalyticsRoute.options.component
    if (!Page) {
      throw new Error("Missing analytics page")
    }
    renderAdmin(<Page />)
    for (const region of ADMIN_ANALYTICS_REGION_ROWS) {
      expect(screen.getByText(new RegExp(`${region.flag} ${region.code}$`, "u"))).toBeVisible()
    }
  })

  it("sizes the analytics bars and region meters from their measurements", () => {
    const Page = AnalyticsRoute.options.component
    if (!Page) {
      throw new Error("Missing analytics page")
    }
    const { container } = renderAdmin(<Page />)
    expect(container.querySelector('[style="height: 45%;"]')).toBeInTheDocument()
    expect(container.querySelector('[style="height: 15%;"]')).toBeInTheDocument()
    const [firstRegion] = ADMIN_ANALYTICS_REGION_ROWS
    expect(container.querySelector(`[style="width: ${firstRegion.percentage}%;"]`)).toBeInTheDocument()
  })

  it("shows a dashboard user's identity, avatar and last activity date", () => {
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getUsersQuery.queryKey, {
      pendingVerification: 0,
      rows: [adminUser(), adminUser({ id: "grace", image: "https://example.com/grace.png", name: "Grace Hopper" })],
      total: 2,
    })
    const Page = DashboardRoute.options.component
    if (!Page) {
      throw new Error("Missing dashboard page")
    }
    renderAdmin(<Page />, { queryClient })
    const [, adaRow] = within(screen.getByRole("table")).getAllByRole("row")
    if (!adaRow) {
      throw new Error("Missing dashboard row")
    }
    expect(adaRow).toHaveTextContent("Ada Lovelace")
    expect(adaRow).toHaveTextContent("ada@example.com")
    expect(adaRow).toHaveTextContent("Jan 1, 2025")
    expect(adaRow).toHaveTextContent("AL")
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
