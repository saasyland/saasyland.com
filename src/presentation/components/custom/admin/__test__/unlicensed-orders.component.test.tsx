import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createTranslator } from "use-intl"
import { describe, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type { License } from "~/src/modules/license/license.types"
import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"

import * as download from "~/src/lib/download"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { UnlicensedOrders } from "~/src/presentation/components/custom/admin/license/unlicensed-orders"

import authDatesMessages from "~/messages/en-US/auth.dates.json"
import gridMessages from "~/messages/en-US/components.custom.data-grid.json"
import dashboardMessages from "~/messages/en-US/dashboard.license.json"

const labels = dashboardMessages.unlicensedOrders
const PLACED_AT = new Date("2026-11-16T09:30:00.000Z")

const dates = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: authDatesMessages, timeZone: I18N.DEFAULT_TIMEZONE })

const unlicensedOrder = (overrides: Partial<License["unlicensedOrder"]> = {}): License["unlicensedOrder"] => ({
  amount: 719.2,
  currency: "EUR",
  customerId: "cus_unmatched",
  id: "ord_unmatched",
  placedAt: PLACED_AT,
  polarUrl: "https://sandbox.polar.sh/dashboard/saasyland/sales/ord_unmatched",
  ...overrides,
})

const renderPanel = (rows: readonly License["unlicensedOrder"][]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(unlicensedOrdersQuery.queryKey, { rows: [...rows] })
  return renderAdmin(<UnlicensedOrders />, { queryClient })
}

const panel = async (): Promise<HTMLElement> => {
  const heading = await screen.findByRole("heading", { level: 2, name: labels.title })
  const container = heading.closest<HTMLElement>("section")
  if (container === null) {
    throw new Error("The unlicensed orders heading is outside its panel")
  }
  return container
}

describe("paid orders without a licence", () => {
  it("lists each order with its date, Polar customer and amount, and links it to Polar in a new tab", async () => {
    renderPanel([unlicensedOrder()])

    const table = within(await panel()).getByRole("table")
    const [header, row] = within(table).getAllByRole("row")
    if (header === undefined || row === undefined) {
      throw new Error("The table has no order row")
    }
    expect(
      within(header)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toStrictEqual(["", labels.columns.order, labels.columns.date, labels.columns.customer, labels.columns.amount])
    const link = within(row).getByRole("link", { name: "Open order ord_unmatched in Polar" })
    expect(link).toHaveAttribute("href", "https://sandbox.polar.sh/dashboard/saasyland/sales/ord_unmatched")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
    expect(link).toHaveTextContent("ord_unmatched")
    expect(row).toHaveTextContent(dates("dateTime", { value: PLACED_AT }))
    expect(row).toHaveTextContent("cus_unmatched")
    expect(row).toHaveTextContent("€719.20")
    expect(screen.queryByText(labels.empty)).not.toBeInTheDocument()
  })

  it("says every paid licence order has its licence when there is none to list", async () => {
    renderPanel([])

    const card = await panel()
    expect(within(card).getByRole("status")).toHaveTextContent(labels.empty)
    expect(within(within(card).getByRole("table")).getAllByRole("row")).toHaveLength(1)
  })

  it("exports each order with its amount in the order's currency", async () => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
    renderPanel([unlicensedOrder()])

    await userEvent.click(await screen.findByRole("button", { name: gridMessages.toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    expect(vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.split("\r\n")[1]).toBe(
      `ord_unmatched,${PLACED_AT.toISOString()},cus_unmatched,719.20 EUR`,
    )
  })
})
