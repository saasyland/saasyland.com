import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { Route as LandingRoute } from "~/src/routes/admin.landing-page"

import { renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminLandingPagePending } from "~/src/presentation/components/custom/admin/content-pending"

import pagesAdminLandingPageMessages from "~/messages/en-US/pages.admin.landing-page.json"

afterEach(() => vi.restoreAllMocks())

describe("admin page builder", () => {
  it("renders its translated title and controls", () => {
    renderAdminPage(LandingRoute.options.component)
    expect(screen.getByRole("heading", { name: pagesAdminLandingPageMessages.metadata.title })).toBeVisible()
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
  })

  it("renders the skeleton of the page at /admin/landing-page", () => {
    const page = markupOf(<AdminLandingPagePending />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/admin/landing-page") })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})
