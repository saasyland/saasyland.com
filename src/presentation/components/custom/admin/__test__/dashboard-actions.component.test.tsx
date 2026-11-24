import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { ADMIN_DASHBOARD_ACTIONS } from "~/src/data/navigation"

import { AdminDashboardPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { DashboardActions } from "~/src/presentation/components/custom/admin/dashboard/actions"

const TEST_ACTION = await vi.hoisted(async () => {
  const { FileDown } = await import("lucide-react")
  const ROUTES = await import("~/src/routes")

  return { icon: FileDown, label: "navigation.reports.dashboard.exportReport", to: ROUTES.ADMIN_SETTINGS } as const
})

const TEST_ACTION_LABEL = "Export report"

vi.mock(import("~/src/data/navigation"), async (importOriginal) => ({
  ...(await importOriginal()),
  ADMIN_DASHBOARD_ACTIONS: [TEST_ACTION],
}))

const messages = {
  navigation: { reports: { dashboard: { exportReport: TEST_ACTION_LABEL } } },
}

describe("dashboard actions", () => {
  it("links every action of the list, labelled by its message key, and nothing else", () => {
    renderWithRouter(
      <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
        <DashboardActions />
      </IntlProvider>,
    )

    expect(screen.getByRole("link", { name: TEST_ACTION_LABEL })).toHaveAttribute("href", TEST_ACTION.to)
    expect(screen.getAllByRole("link")).toHaveLength(ADMIN_DASHBOARD_ACTIONS.length)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("draws a button placeholder for every action", () => {
    const { container } = render(<AdminDashboardPending />)

    expect(container.querySelectorAll(".h-9.w-32.rounded-md")).toHaveLength(ADMIN_DASHBOARD_ACTIONS.length)
  })
})
