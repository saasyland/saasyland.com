import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { Route as PaymentsRoute } from "~/src/routes/admin.payments"
import { Route as PricingRoute } from "~/src/routes/admin.pricing-models"

import { renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminPaymentsPending, AdminPricingModelsPending } from "~/src/presentation/components/custom/admin/payments-pending"

import pagesAdminPaymentsMessages from "~/messages/en-US/pages.admin.payments.json"
import pagesAdminPricingModelsMessages from "~/messages/en-US/pages.admin.pricing-models.json"

afterEach(() => vi.restoreAllMocks())

describe("admin payments and pricing models", () => {
  it.each([
    ["payments", PaymentsRoute, pagesAdminPaymentsMessages.title],
    ["pricing models", PricingRoute, pagesAdminPricingModelsMessages.metadata.title],
  ] as const)("renders the %s page with its translated title and controls", (_, route, title) => {
    renderAdminPage(route.options.component)
    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
  })

  it("shows the refund details when the refunds tab is selected", async () => {
    renderAdminPage(PaymentsRoute.options.component)
    await userEvent.click(screen.getByRole("tab", { name: pagesAdminPaymentsMessages.tabs.refunds }))
    expect(screen.getByRole("table")).toBeVisible()
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1)
  })

  it.each([
    ["/admin/pricing-models", AdminPricingModelsPending],
    ["/admin/payments", AdminPaymentsPending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter(path) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})
