import { render } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { RegionalDiscounts } from "~/src/presentation/components/custom/regional-discounts"

describe("RegionalDiscounts", () => {
  it.each([
    ["en-US", "20%, 30%, 40%, and 50%"],
    ["de-DE", "20 %, 30 %, 40 % und 50 %"],
  ] as const)("lists the regional discounts from PPP_TIERS as percentages for %s", (locale, expected) => {
    const { container } = render(
      <IntlProvider locale={locale} messages={{}} timeZone="UTC">
        <RegionalDiscounts />
      </IntlProvider>,
    )

    expect(container).toHaveTextContent(expected)
  })
})
