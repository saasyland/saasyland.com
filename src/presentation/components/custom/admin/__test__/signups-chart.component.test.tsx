import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vite-plus/test"

import { TIME_RANGE, type TimeRange, bucketKey, pointsOf, timeSeries } from "~/src/modules/_core/utils/time-series"
import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"

import { fixtureDate } from "~/src/presentation/components/custom/admin/__test__/fixture-date"
import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { SignupsChart } from "~/src/presentation/components/custom/admin/dashboard/signups-chart"
import { TimeSeriesBars } from "~/src/presentation/components/custom/admin/dashboard/time-series-chart"

import dashboardMessages from "~/messages/en-US/dashboard.auth.json"
import pagesAdminDashboardMessages from "~/messages/en-US/pages.admin.dashboard.json"

beforeAll(() => TimeSeriesBars.preload?.())

const labels = dashboardMessages.signups
const ranges = pagesAdminDashboardMessages.chart.range

const signups = (range: TimeRange, perBucket: number) => {
  const series = timeSeries(range, fixtureDate)
  const points = pointsOf(series, new Map(series.starts.slice(-2).map((start) => [bucketKey(start, series.bucket), perBucket])))

  return { bucket: series.bucket, points, total: points.reduce((total, { value }) => total + value, 0) }
}

const renderChart = () => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(userSignupsQuery().queryKey, signups(TIME_RANGE.LAST_30_DAYS, 1))
  queryClient.setQueryData(userSignupsQuery({ range: TIME_RANGE.LAST_12_MONTHS }).queryKey, signups(TIME_RANGE.LAST_12_MONTHS, 1500))
  queryClient.setQueryData(userSignupsQuery({ range: TIME_RANGE.LAST_7_DAYS }).queryKey, signups(TIME_RANGE.LAST_7_DAYS, 0))
  return renderAdmin(<SignupsChart />, { queryClient })
}

describe("new users panel", () => {
  it("counts the accounts created in the last 30 days and lists them by day", () => {
    renderChart()

    expect(screen.getByRole("heading", { level: 2, name: labels.title })).toBeVisible()
    expect(screen.getByText("2 new users")).toBeVisible()
    expect(screen.getByRole("radio", { name: ranges["30d"] })).toBeChecked()
    const days = within(screen.getByRole("table", { name: labels.series })).getAllByRole("row")
    expect(days).toHaveLength(30)
    expect(days.at(-1)).toHaveTextContent("Jan 1, 20251")
  })

  it("switches to months and to an empty week", async () => {
    renderChart()

    await userEvent.click(screen.getByRole("radio", { name: ranges["12m"] }))

    expect(await screen.findByText("3,000 new users")).toBeVisible()
    expect(
      within(screen.getByRole("table", { name: labels.series }))
        .getAllByRole("row")
        .at(-1),
    ).toHaveTextContent("January 20251,500")

    await userEvent.click(screen.getByRole("radio", { name: ranges["7d"] }))

    expect(await screen.findByText(labels.empty)).toBeVisible()
    expect(screen.queryByRole("table")).toBeNull()
  })
})
