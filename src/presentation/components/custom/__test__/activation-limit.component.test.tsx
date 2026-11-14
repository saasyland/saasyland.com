import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { ActivationLimit } from "~/src/presentation/components/custom/activation-limit"

describe("ActivationLimit", () => {
  it.each(["en-US", "ja-JP"] as const)("prints every tier's activation limit from LICENSE_ACTIVATION_LIMITS formatted for %s", (locale) => {
    render(
      <IntlProvider locale={locale} messages={{}} timeZone="UTC">
        <ul>
          {LICENSE_TIERS.map((tier) => (
            <li key={tier}>
              <ActivationLimit tier={tier} />
            </li>
          ))}
        </ul>
      </IntlProvider>,
    )

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(
      LICENSE_TIERS.map((tier) => new Intl.NumberFormat(locale).format(LICENSE_ACTIVATION_LIMITS[tier])),
    )
  })
})
