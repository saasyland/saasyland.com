import type { ReactElement } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup } from "~/src/platform/testing/lib/skeleton"

import { LICENSE_STATUS, LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { AppPending } from "~/src/presentation/components/custom/app/app-pending"
import { AppOverviewPending } from "~/src/presentation/components/custom/app/auth-pending"
import { AppLicensePending } from "~/src/presentation/components/custom/app/license-pending"

const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"

const SELECTORS = {
  ACTIVATION: ".size-11.rounded-full",
  CARD: "[data-slot=card]",
  CHOSEN_TIER: "[class*='lg:grid-cols-[1fr_18rem]']",
  SECTION: "[data-section=included]",
  STATUS_BADGE: "[data-slot=card-action]",
  TIER_COLUMN: "[class~='@container'] > div > div",
} as const

const license = (overrides: Partial<License["select"]> = {}): License["select"] => ({
  createdAt: new Date("2026-09-08T10:00:00Z"),
  id: "license-1",
  key: "key",
  polarCustomerId: "customer-1",
  polarLicenseKeyId: "polar-license-1",
  polarOrderId: "order-1",
  purchaseCreatedAt: new Date(0),
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.CORE,
  updatedAt: new Date("2026-09-08T10:00:00Z"),
  userId: "user-1",
  ...overrides,
})

vi.mock("~/src/data/license-offer.entries", () => ({
  TEST_LICENSE_OFFER: [
    { Pending: () => <div data-section="included" />, Section: () => <span />, key: "included", load: () => Promise.resolve() },
  ],
}))

interface Cache {
  readonly owned?: License["select"]
}

const renderAt = (ui: ReactElement, path: string, { owned }: Cache = {}) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(currentLicenseQuery.queryKey, { license: owned })
  return renderWithRouter(ui, { queryClient, router: createTestRouter(path) }).container
}

afterEach(cleanup)

describe("license skeletons", () => {
  it.each([
    ["/app", AppOverviewPending],
    ["/pl-PL/app", AppOverviewPending],
    ["/app/license", AppLicensePending],
    ["/uk-UA/app/license", AppLicensePending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = busyMarkup(renderAt(<Page />, path))
    cleanup()
    const container = renderAt(<AppPending />, path)

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it.each([
    ["/app", AppOverviewPending],
    ["/app/license", AppLicensePending],
  ])("mirrors the tier grid for an account without a license at %s", (path, Page) => {
    const container = renderAt(<Page />, path)

    expect(container.querySelectorAll(SELECTORS.TIER_COLUMN)).toHaveLength(LICENSE_TIERS.length)
    expect(container.querySelector(SELECTORS.CHOSEN_TIER)).toBeNull()
    expect(container.querySelector(SELECTORS.ACTIVATION)).toBeNull()
    expect(container.querySelector(SELECTORS.CARD)).toBeNull()
  })

  it.each([
    ["/app", AppOverviewPending],
    ["/app/license", AppLicensePending],
  ])("adds the chosen tier above the grid at %s", (path, Page) => {
    const container = renderAt(<Page />, `${path}?tier=${LICENSE_TIER.AGENCY}`)

    expect(container.querySelector(SELECTORS.CHOSEN_TIER)).not.toBeNull()
    expect(container.querySelectorAll(SELECTORS.TIER_COLUMN)).toHaveLength(LICENSE_TIERS.length)
  })

  it.each([
    ["/app", AppOverviewPending],
    ["/app/license", AppLicensePending],
  ])("ends the offer with the skeleton of what other areas include at %s", (path, Page) => {
    expect(renderAt(<Page />, path).querySelectorAll(SELECTORS.SECTION)).toHaveLength(1)
    cleanup()
    expect(renderAt(<Page />, path, { owned: license() }).querySelectorAll(SELECTORS.SECTION)).toHaveLength(0)
  })

  it.each([
    ["/app", AppOverviewPending],
    ["/app/license", AppLicensePending],
  ])("shows only the activation panel while a payment activates at %s", (path, Page) => {
    const container = renderAt(<Page />, `${path}?checkoutId=${CHECKOUT_ID}&tier=${LICENSE_TIER.CORE}`)

    expect(container.querySelector(SELECTORS.ACTIVATION)).not.toBeNull()
    expect(container.querySelector(SELECTORS.CHOSEN_TIER)).toBeNull()
    expect(container.querySelectorAll(SELECTORS.TIER_COLUMN)).toHaveLength(0)
  })

  it("mirrors the license status card on the overview of a license owner", () => {
    const container = renderAt(<AppOverviewPending />, "/app", { owned: license() })

    expect(container.querySelector(SELECTORS.STATUS_BADGE)).not.toBeNull()
    expect(container.querySelectorAll(SELECTORS.TIER_COLUMN)).toHaveLength(0)
  })

  it("mirrors the key and machine cards on the license page of a license owner", () => {
    const container = renderAt(<AppLicensePending />, "/app/license", { owned: license() })

    expect(container.querySelectorAll(SELECTORS.CARD)).toHaveLength(2)
    expect(container.querySelectorAll(SELECTORS.TIER_COLUMN)).toHaveLength(0)
  })

  it("leaves the machine card out until the key exists and keeps the offer next to a refunded license", () => {
    const container = renderAt(<AppLicensePending />, "/app/license", {
      owned: license({ polarLicenseKeyId: JSON_NULL, status: LICENSE_STATUS.REVOKED }),
    })

    expect(container.querySelectorAll(SELECTORS.CARD)).toHaveLength(1)
    expect(container.querySelectorAll(SELECTORS.TIER_COLUMN)).toHaveLength(LICENSE_TIERS.length)
  })
})
