import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vite-plus/test"

import { TIME_BUCKET, TIME_RANGE, type TimeBucket, type TimeRange, pointsOf, timeSeries } from "~/src/modules/_core/utils/time-series"
import type { Order } from "~/src/modules/order/order.types"
import { revenueQuery } from "~/src/modules/order/use-cases/get-revenue"

import { fixtureDate } from "~/src/presentation/components/custom/admin/__test__/fixture-date"
import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { RevenueChart } from "~/src/presentation/components/custom/admin/payments/revenue-chart"

import dashboardMessages from "~/messages/en-US/dashboard.payments.json"
import pagesAdminDashboardMessages from "~/messages/en-US/pages.admin.dashboard.json"

const labels = dashboardMessages.revenue
const ranges = pagesAdminDashboardMessages.chart.range

const currencyRevenue = (range: TimeRange, overrides: Partial<Order["currencyRevenue"]> = {}): Order["currencyRevenue"] => {
  const series = timeSeries(range, fixtureDate)

  return {
    currency: "USD",
    gross: 397,
    net: 249,
    orders: 3,
    points: pointsOf(series, new Map([[series.starts.at(-1)?.toISOString().slice(0, 10) ?? "", 199]])),
    refunded: 148,
    ...overrides,
  }
}

const revenue = (bucket: TimeBucket, currencies: Order["currencyRevenue"][]): Order["revenue"] => ({ bucket, currencies })

const renderChart = (data: Order["revenue"]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(revenueQuery().queryKey, data)
  return renderAdmin(<RevenueChart />, { queryClient })
}

const figure = (name: string): string | null | undefined =>
  screen.getByText(name, { selector: "dt" }).parentElement?.querySelector("dd")?.textContent

describe("revenue panel", () => {
  it("says so when no order was paid in the period, and draws no chart", () => {
    renderChart(revenue(TIME_BUCKET.DAY, []))

    expect(screen.getByRole("heading", { level: 2, name: labels.title })).toBeVisible()
    expect(screen.getByText(labels.empty)).toBeVisible()
    expect(screen.queryByRole("tablist")).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("shows each currency's revenue after refunds, its orders and its refunds, and lists every day of the chart", async () => {
    renderChart(
      revenue(TIME_BUCKET.DAY, [
        currencyRevenue(TIME_RANGE.LAST_30_DAYS),
        currencyRevenue(TIME_RANGE.LAST_30_DAYS, { currency: "EUR", gross: 719.2, net: 719.2, orders: 1, refunded: 0 }),
      ]),
    )

    const tabs = within(screen.getByRole("tablist", { name: labels.currencies })).getAllByRole("tab")
    expect(tabs.map((tab) => tab.textContent)).toStrictEqual(["USD", "EUR"])
    expect(figure(labels.net)).toBe("$249.00")
    expect(figure(labels.orders)).toBe("3")
    expect(figure(labels.refunded)).toBe("$148.00")
    const days = within(screen.getByRole("table", { name: labels.series })).getAllByRole("row")
    expect(days).toHaveLength(30)
    expect(days.at(-1)).toHaveTextContent("Jan 1, 2025$199.00")
    expect(days.at(0)).toHaveTextContent("Dec 3, 2024$0.00")

    await userEvent.click(screen.getByRole("tab", { name: "EUR" }))

    expect(figure(labels.net)).toBe("€719.20")
    expect(figure(labels.refunded)).toBe("€0.00")
  })

  it("names the months of a 12-month chart", () => {
    renderChart(revenue(TIME_BUCKET.MONTH, [currencyRevenue(TIME_RANGE.LAST_12_MONTHS)]))

    const months = within(screen.getByRole("table", { name: labels.series })).getAllByRole("row")
    expect(months).toHaveLength(12)
    expect(months.at(0)).toHaveTextContent("February 2024")
    expect(months.at(-1)).toHaveTextContent("January 2025")
  })

  it("keeps the current period on screen while the next one loads, then shows it", async () => {
    const { queryClient } = renderChart(revenue(TIME_BUCKET.DAY, [currencyRevenue(TIME_RANGE.LAST_30_DAYS)]))
    const pending = Promise.withResolvers<Order["revenue"]>()
    void queryClient.query({ queryFn: () => pending.promise, queryKey: revenueQuery({ range: TIME_RANGE.LAST_7_DAYS }).queryKey })

    await userEvent.click(screen.getByRole("radio", { name: ranges["7d"] }))

    expect(figure(labels.net)).toBe("$249.00")
    expect(screen.getByText(labels.net, { selector: "dt" }).closest("[aria-busy]")).toHaveAttribute("aria-busy", "true")

    await act(async () => {
      pending.resolve(revenue(TIME_BUCKET.DAY, []))
      await pending.promise
    })

    expect(await screen.findByText(labels.empty)).toBeVisible()
    expect(screen.getByRole("radio", { name: ranges["7d"] })).toBeChecked()
    expect(screen.getByText(labels.empty).closest("[aria-busy]")).toHaveAttribute("aria-busy", "false")
  })
})
