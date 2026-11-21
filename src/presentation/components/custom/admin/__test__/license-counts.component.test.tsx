import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { LICENSE_STATUS, LICENSE_TIER, type LicenseStatus, type LicenseTier } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { licenseCountsQuery } from "~/src/modules/license/use-cases/get-license-counts"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminDashboardPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { LicenseCounts, LicenseCountsPending } from "~/src/presentation/components/custom/admin/license/license-counts"

import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import dashboardMessages from "~/messages/en-US/dashboard.license.json"

const labels = dashboardMessages.licenses

const licenseCount = (tier: LicenseTier, counts: Partial<Pick<License["licenseCount"], LicenseStatus>> = {}): License["licenseCount"] => ({
  [LICENSE_STATUS.ACTIVE]: 0,
  [LICENSE_STATUS.REFUNDED]: 0,
  [LICENSE_STATUS.REVOKED]: 0,
  ...counts,
  id: tier,
  tier,
})

const renderPanel = (rows: readonly License["licenseCount"][]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(licenseCountsQuery.queryKey, { rows: [...rows] })
  return renderAdmin(<LicenseCounts />, { queryClient })
}

const cellsOf = (row: HTMLElement | undefined, role: "cell" | "columnheader"): (string | null)[] =>
  within(row ?? document.body)
    .getAllByRole(role)
    .map((cell) => cell.textContent)

describe("licences by tier", () => {
  it("lists each tier by its name with its active, revoked and refunded licences", () => {
    renderPanel([
      licenseCount(LICENSE_TIER.CORE, { active: 1250, refunded: 7, revoked: 2 }),
      licenseCount(LICENSE_TIER.COMPLETE, { active: 40, refunded: 1 }),
      licenseCount(LICENSE_TIER.AGENCY, { active: 3, revoked: 1 }),
    ])

    expect(screen.getByRole("heading", { level: 2, name: labels.title })).toBeVisible()
    expect(screen.getByText(labels.description)).toBeVisible()
    const [header, core, complete, agency] = within(screen.getByRole("table")).getAllByRole("row")
    expect(cellsOf(header, "columnheader")).toStrictEqual([
      labels.columns.tier,
      labels.columns.active,
      labels.columns.revoked,
      labels.columns.refunded,
    ])
    expect(cellsOf(core, "cell")).toStrictEqual([pricingMessages.tiers.core.name, "1,250", "2", "7"])
    expect(cellsOf(complete, "cell")).toStrictEqual([pricingMessages.tiers.complete.name, "40", "0", "1"])
    expect(cellsOf(agency, "cell")).toStrictEqual([pricingMessages.tiers.agency.name, "3", "1", "0"])
  })

  it("shows every tier with zero licences before the first sale", () => {
    renderPanel([licenseCount(LICENSE_TIER.CORE), licenseCount(LICENSE_TIER.COMPLETE), licenseCount(LICENSE_TIER.AGENCY)])

    const [, ...tiers] = within(screen.getByRole("table")).getAllByRole("row")
    expect(tiers.map((row) => cellsOf(row, "cell").slice(1))).toStrictEqual([
      ["0", "0", "0"],
      ["0", "0", "0"],
      ["0", "0", "0"],
    ])
  })

  it("draws its skeleton among the dashboard's pending panels", () => {
    const { container } = renderWithRouter(<AdminDashboardPending />, { router: createTestRouter("/admin") })

    expect(busyMarkup(container)).toContain(markupOf(<LicenseCountsPending />))
  })
})
