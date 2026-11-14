import type * as RouterModule from "@tanstack/react-router"
import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { Route as AdminRoute } from "~/src/routes/admin"
import { Route as AnalyticsRoute } from "~/src/routes/admin.analytics"

import { ADMIN_ANALYTICS_REGION_ROWS } from "~/src/data/admin"

import { breadcrumbDividers, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminAnalyticsPending } from "~/src/presentation/components/custom/admin/overview-pending"

import pagesAdminAnalyticsMessages from "~/messages/en-US/pages.admin.analytics.json"
import pagesAdminMessages from "~/messages/en-US/pages.admin.json"
import pagesAdminSidebarMessages from "~/messages/en-US/pages.admin.sidebar.json"

vi.mock(import("~/src/hooks/use-mobile"), () => ({ useIsMobile: () => false }))
vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<typeof RouterModule>()), Outlet: () => null }))

afterEach(() => vi.restoreAllMocks())

describe("admin analytics", () => {
  it("renders its translated title and controls", () => {
    renderAdminPage(AnalyticsRoute.options.component)
    expect(screen.getByRole("heading", { name: pagesAdminAnalyticsMessages.title })).toBeVisible()
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
  })

  it("keeps unfamiliar region codes visible when Intl has no display name", () => {
    vi.spyOn(Intl.DisplayNames.prototype, "of").mockReturnValue(undefined)
    renderAdminPage(AnalyticsRoute.options.component)
    for (const region of ADMIN_ANALYTICS_REGION_ROWS) {
      expect(screen.getByText(new RegExp(`${region.flag} ${region.code}$`, "u"))).toBeVisible()
    }
  })

  it("sizes the analytics bars and region meters from their measurements", () => {
    const { container } = renderAdminPage(AnalyticsRoute.options.component)
    expect(container.querySelector('[style="height: 45%;"]')).toBeInTheDocument()
    expect(container.querySelector('[style="height: 15%;"]')).toBeInTheDocument()
    const [firstRegion] = ADMIN_ANALYTICS_REGION_ROWS
    expect(container.querySelector(`[style="width: ${firstRegion.percentage}%;"]`)).toBeInTheDocument()
  })

  it("renders breadcrumbs and navigation for /admin/analytics", () => {
    renderAdminPage(AdminRoute.options.component, { path: "/admin/analytics" })
    expect(screen.getAllByRole("link", { name: pagesAdminSidebarMessages.links.dashboard }).length).toBeGreaterThan(0)
    expect(screen.getByRole("navigation", { name: pagesAdminMessages.components.breadcrumbs.home })).toBeVisible()
  })

  it("renders the skeleton of the page at /admin/analytics", () => {
    const page = markupOf(<AdminAnalyticsPending />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/admin/analytics") })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("draws the breadcrumb trail of /admin/analytics", () => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/admin/analytics") })

    expect(breadcrumbDividers(container)).toHaveLength(1)
  })
})
