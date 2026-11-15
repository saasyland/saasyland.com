import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { ADMIN_DASHBOARD_ACTIONS } from "~/src/data/navigation"

import { AdminDashboardPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { DashboardActions } from "~/src/presentation/components/custom/admin/dashboard/actions"

import pagesAdminDashboardMessages from "~/messages/en-US/pages.admin.dashboard.json"

const TEST_ACTION = await vi.hoisted(async () => {
  const { FileDown } = await import("lucide-react")
  const { NAVIGATION_PLACEMENT } = await import("~/src/data/navigation.constants")
  const { ROUTES } = await import("~/src/routes")

  return {
    area: "reports",
    icon: FileDown,
    key: "exportReport",
    order: 10,
    placement: NAVIGATION_PLACEMENT.DASHBOARD,
    to: ROUTES.ADMIN_SETTINGS,
  } as const
})

const TEST_ACTION_LABEL = "Export report"

vi.mock(import("~/src/data/navigation"), async (importOriginal) => ({
  ...(await importOriginal()),
  ADMIN_DASHBOARD_ACTIONS: [TEST_ACTION],
}))

const messages = {
  navigation: { [TEST_ACTION.area]: { [TEST_ACTION.placement]: { [TEST_ACTION.key]: TEST_ACTION_LABEL } } },
  pages: { admin: { dashboard: { actions: { last30Days: pagesAdminDashboardMessages.actions.last30Days } } } },
}

describe("dashboard actions", () => {
  it("links every action an area contributes after the disabled date range, labelled by its area", () => {
    renderWithRouter(
      <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
        <DashboardActions />
      </IntlProvider>,
    )

    expect(screen.getByRole("button", { name: pagesAdminDashboardMessages.actions.last30Days })).toBeDisabled()
    expect(screen.getByRole("link", { name: TEST_ACTION_LABEL })).toHaveAttribute("href", TEST_ACTION.to)
    expect(screen.getAllByRole("link")).toHaveLength(ADMIN_DASHBOARD_ACTIONS.length)
  })

  it("draws a button placeholder beside the date range for every action", () => {
    const { container } = render(<AdminDashboardPending />)

    expect(container.querySelectorAll(".h-9.rounded-lg")).toHaveLength(ADMIN_DASHBOARD_ACTIONS.length + 1)
  })
})
