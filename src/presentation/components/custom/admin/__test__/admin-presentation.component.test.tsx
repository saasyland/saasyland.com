import { act, renderHook, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { Route as DashboardRoute } from "~/src/routes/admin.index"

import { ADMIN_ANALYTICS_REGION_ROWS } from "~/src/data/admin"

import { adminMessages, adminQueryClient, adminUser, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { useDemoAnalytics } from "~/src/presentation/components/custom/admin/analytics/hooks/use-demo-analytics"
import { DashboardUsersTableRow } from "~/src/presentation/components/custom/admin/dashboard/components/dashboard-users-table-row"
import { AllUsersTable } from "~/src/presentation/components/custom/admin/users/all/components/all-users-table"

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
    renderAdmin(<AllUsersTable users={[user]} />)
    expect(screen.getByText("external-role")).toBeVisible()
  })

  it("replaces loading placeholders after the dashboard data arrives", async () => {
    const pending = Promise.withResolvers<ReturnType<typeof adminUser>[]>()
    vi.spyOn(getUsersQuery, "queryFn").mockReturnValue(pending.promise)
    const queryClient = adminQueryClient()
    queryClient.removeQueries({ queryKey: getUsersQuery.queryKey })
    const Page = DashboardRoute.options.component
    if (!Page) {
      throw new Error("Missing dashboard page")
    }
    const { container } = renderAdmin(<Page />, { queryClient })
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(2)
    await act(async () => {
      pending.resolve([adminUser()])
      await pending.promise
    })
    expect(await screen.findByText("Ada Lovelace")).toBeVisible()
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
  })
})
