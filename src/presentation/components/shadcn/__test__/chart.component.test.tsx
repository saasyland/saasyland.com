import { cleanup, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { ChartContainer, ChartTooltipContent } from "~/src/presentation/components/shadcn/chart"

const REVENUE = 1_234_567.5

afterEach(() => {
  cleanup()
})

describe("chart tooltip", () => {
  it("formats a value for the page's locale, not the browser's", () => {
    render(
      <IntlProvider locale="de-DE" messages={getTestMessages("de-DE")} timeZone="UTC">
        <ChartContainer config={{ revenue: { label: "Umsatz" } }}>
          <ChartTooltipContent active payload={[{ dataKey: "revenue", graphicalItemId: "revenue", name: "revenue", value: REVENUE }]} />
        </ChartContainer>
      </IntlProvider>,
    )

    expect(screen.getByText("1.234.567,5")).toBeVisible()
  })
})
