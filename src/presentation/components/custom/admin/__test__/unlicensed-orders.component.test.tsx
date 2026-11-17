import { screen, within } from "@testing-library/react"
import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type { License } from "~/src/modules/license/license.types"
import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { UnlicensedOrders } from "~/src/presentation/components/custom/admin/license/unlicensed-orders"

import commonMessages from "~/messages/en-US/common.json"
import dashboardMessages from "~/messages/en-US/dashboard.license.json"

const labels = dashboardMessages.unlicensedOrders
const PLACED_AT = new Date("2026-11-16T09:30:00.000Z")

const common = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: commonMessages, timeZone: I18N.DEFAULT_TIMEZONE })

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
  const container = heading.closest<HTMLElement>("[data-slot=card]")
  if (container === null) {
    throw new Error("The unlicensed orders heading is outside a card")
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
    ).toStrictEqual([labels.columns.order, labels.columns.date, labels.columns.customer, labels.columns.amount])
    const link = within(row).getByRole("link", { name: "Open order ord_unmatched in Polar" })
    expect(link).toHaveAttribute("href", "https://sandbox.polar.sh/dashboard/saasyland/sales/ord_unmatched")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
    expect(link).toHaveTextContent("ord_unmatched")
    expect(row).toHaveTextContent(common("dateTime", { value: PLACED_AT }))
    expect(row).toHaveTextContent("cus_unmatched")
    expect(row).toHaveTextContent("€719.20")
    expect(screen.queryByText(labels.empty)).not.toBeInTheDocument()
  })

  it("says every paid licence order has its licence when there is none to list", async () => {
    renderPanel([])

    const card = await panel()
    expect(within(card).getByText(labels.empty)).toBeVisible()
    expect(within(card).queryByRole("table")).not.toBeInTheDocument()
  })
})
