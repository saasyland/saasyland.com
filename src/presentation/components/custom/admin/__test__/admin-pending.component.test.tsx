import { describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { breadcrumbDividers } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminDashboardPending, AdminSettingsPending } from "~/src/presentation/components/custom/admin/auth-pending"

import { routeTree } from "~/src/routeTree.gen"

describe("admin skeletons", () => {
  it.each([
    ["/admin", AdminDashboardPending],
    ["/de-DE/admin/settings", AdminSettingsPending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter(path, routeTree) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("renders only the layout chrome at /admin/unknown", () => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/admin/unknown", routeTree) })

    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each([
    ["/admin", 1],
    ["/admin/unknown/create", 0],
  ])("draws the breadcrumb trail of %s", (path, dividers) => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter(path, routeTree) })

    expect(breadcrumbDividers(container)).toHaveLength(dividers)
  })
})
