import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"

import { TIERS, TIER_PRICES } from "~/src/data/marketing"

import { TierPrice } from "~/src/presentation/components/custom/tier-price"

describe("TierPrice", () => {
  it.each(["en-US", "pl-PL"] as const)("prints every tier's list price from TIER_PRICES formatted for %s", (locale) => {
    render(
      <IntlProvider locale={locale} messages={{}} timeZone="UTC">
        <ul>
          {TIERS.map((tier) => (
            <li key={tier}>
              <TierPrice tier={tier} />
            </li>
          ))}
        </ul>
      </IntlProvider>,
    )

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(
      TIERS.map((tier) => new Intl.NumberFormat(locale, CURRENCY_FORMAT).format(TIER_PRICES[tier])),
    )
  })
})
