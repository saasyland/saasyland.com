import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { TIME_BUCKET, TIME_RANGE, bucketKey, pointsOf, timeSeries } from "~/src/modules/_core/utils/time-series"

import { TimeSeriesChart } from "~/src/presentation/components/custom/admin/dashboard/time-series-chart"

const NOW = new Date("2026-11-20T12:00:00.000Z")
const SERIES = timeSeries(TIME_RANGE.LAST_7_DAYS, NOW)
const CHART = { height: 200, width: 320 } as const

afterEach(() => vi.restoreAllMocks())

describe("time series chart", () => {
  it("shows the hovered day's value with the panel's own formatter", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect(CHART))
    const points = pointsOf(SERIES, new Map(SERIES.starts.map((start, index) => [bucketKey(start, SERIES.bucket), index + 1])))
    const { container } = render(
      <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={{}} timeZone={I18N.DEFAULT_TIMEZONE}>
        <TimeSeriesChart
          bucket={TIME_BUCKET.DAY}
          formatTick={(value) => `tick ${String(value)}`}
          formatValue={(value) => `${String(value)} sign-ups`}
          label="New users"
          points={points}
        />
      </IntlProvider>,
    )
    const surface = container.querySelector(".recharts-wrapper")
    if (surface === null) {
      throw new Error("The chart rendered no surface")
    }

    fireEvent.mouseMove(surface, { clientX: CHART.width - 1, clientY: CHART.height / 2 })

    await waitFor(() => {
      expect(screen.getByText("7 sign-ups", { ignore: "td" })).toBeInTheDocument()
    })
  })
})
