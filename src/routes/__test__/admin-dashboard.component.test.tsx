import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"
import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"
import { POLAR_READ } from "~/src/modules/order/order.constants"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import { getVideosQuery } from "~/src/modules/video/use-cases/get-videos"

import { Route as DashboardRoute } from "~/src/routes/admin.index"

import * as download from "~/src/lib/download"
import { polarProductsQuery } from "~/src/lib/polar-catalogue"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { adminMessages, adminQueryClient, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { adminPolarProduct } from "~/src/presentation/components/custom/admin/__test__/products.fixtures"
import { AdminDashboardPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { DASHBOARD_STATS } from "~/src/presentation/components/custom/admin/dashboard/stats"

import gridMessages from "~/messages/en-US/components.custom.data-grid.json"
import authDashboardMessages from "~/messages/en-US/dashboard.auth.json"
import coursesDashboardMessages from "~/messages/en-US/dashboard.courses.json"
import licenseDashboardMessages from "~/messages/en-US/dashboard.license.json"
import newsletterDashboardMessages from "~/messages/en-US/dashboard.newsletter.json"
import paymentsDashboardMessages from "~/messages/en-US/dashboard.payments.json"
import productsDashboardMessages from "~/messages/en-US/dashboard.products.json"
import pagesAdminDashboardMessages from "~/messages/en-US/pages.admin.dashboard.json"

const TWO_PRODUCTS = {
  products: [adminPolarProduct(), adminPolarProduct({ id: "prod_complete", name: "Complete" })],
  read: POLAR_READ.AVAILABLE,
}

afterEach(() => vi.restoreAllMocks())

const usersTable = (): HTMLElement =>
  within(
    screen.getByRole("heading", { level: 2, name: pagesAdminDashboardMessages.users.title }).closest<HTMLElement>("section") ??
      document.body,
  ).getByRole("table")

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
    expect(within(usersTable()).getAllByRole("row")).toHaveLength(Math.min(count, 5) + 1)
    expect(screen.getByRole("link", { name: pagesAdminDashboardMessages.users.table.pagination.viewAll })).toHaveAttribute(
      "href",
      "/admin/users",
    )
  })

  it("links a dashboard user to their profile and shows their identity, avatar and join date", () => {
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getUsersQuery.queryKey, {
      pendingVerification: 0,
      rows: [
        adminUser({ updatedAt: new Date("2026-11-20T12:00:00Z") }),
        adminUser({ id: "grace", image: "https://example.com/grace.png", name: "Grace Hopper" }),
      ],
      total: 2,
    })
    renderAdminPage(DashboardRoute.options.component, { queryClient })
    const [, adaRow] = within(usersTable()).getAllByRole("row")
    if (!adaRow) {
      throw new Error("Missing dashboard row")
    }
    expect(within(adaRow).getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/admin/users/ada")
    expect(within(adaRow).queryByRole("button")).toBeNull()
    expect(adaRow).toHaveTextContent("ada@example.com")
    expect(adaRow).toHaveTextContent("Jan 1, 2025")
    expect(adaRow).not.toHaveTextContent("Nov 20, 2026")
    expect(adaRow).toHaveTextContent("AL")
  })

  it("exports the newest users with their status as the table names it", async () => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: [adminUser()], total: 1 })
    renderAdminPage(DashboardRoute.options.component, { queryClient })

    await userEvent.click(
      within(usersTable().closest("section") ?? document.body).getByRole("button", { name: gridMessages.toolbar.export }),
    )

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    expect(vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.split("\r\n")[1]).toBe(
      `Ada Lovelace <ada@example.com>,customer,${pagesAdminDashboardMessages.users.table.status.active},2025-01-01T12:00:00.000Z`,
    )
  })

  it("reads every statistic from its query and shows only real panels", () => {
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 3, rows: [adminUser()], total: 12_345 })
    queryClient.setQueryData(polarProductsQuery.queryKey, TWO_PRODUCTS)
    queryClient.setQueryData(courseProgressQuery.queryKey, { learners: 41, rows: [] })
    queryClient.setQueryData(getVideosQuery.queryKey, { rows: [], total: 7 })
    queryClient.setQueryData(newsletterSubscribersQuery.queryKey, { total: 1500 })
    renderAdminPage(DashboardRoute.options.component, { queryClient })

    const stats = [...document.querySelectorAll("dl:first-of-type > div")].map((stat) => stat.textContent)
    expect(stats).toStrictEqual([
      `${authDashboardMessages.registeredUsers}12,345`,
      `${productsDashboardMessages.totalProducts}2`,
      `${authDashboardMessages.pendingVerification}3`,
      `${coursesDashboardMessages.learners}41`,
      `${coursesDashboardMessages.videos}7`,
      `${newsletterDashboardMessages.subscribers}1,500`,
    ])
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toStrictEqual([
      licenseDashboardMessages.unlicensedOrders.title,
      licenseDashboardMessages.licenses.title,
      paymentsDashboardMessages.revenue.title,
      authDashboardMessages.signups.title,
      coursesDashboardMessages.progress.title,
      pagesAdminDashboardMessages.users.title,
    ])
    expect(screen.getByText(paymentsDashboardMessages.revenue.empty)).toBeVisible()
    expect(screen.getByText(authDashboardMessages.signups.empty)).toBeVisible()
    expect(screen.getByText(coursesDashboardMessages.progress.empty)).toBeVisible()
  })

  it.each(I18N.SUPPORTED_LOCALES)("labels every statistic in %s", (locale) => {
    const messages = getTestMessages(locale)

    for (const { label } of DASHBOARD_STATS) {
      expect(messages).toHaveProperty(label.split("."), expect.stringMatching(/\S/u))
    }
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
