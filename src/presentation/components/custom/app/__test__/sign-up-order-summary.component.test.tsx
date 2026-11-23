import { cleanup, screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { LICENSE_TIER, LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"

import { PURCHASE_STEP, PURCHASE_STEP_COUNT } from "~/src/data/license"
import { TIER_PRICES } from "~/src/data/marketing"
import { CURRENCY_FORMAT } from "~/src/data/pricing"
import { REFUND_TERMS } from "~/src/data/refunds"

import { SignUpOrderSummaryPending } from "~/src/presentation/components/custom/app/license-pending"
import { SignUpOrderSummary } from "~/src/presentation/components/custom/app/sign-up-order-summary"

import pricing from "~/messages/en-US/components.custom.pricing.json"
import plPricing from "~/messages/pl-PL/components.custom.pricing.json"
import * as ROUTES from "~/src/routes"

const LIST_PRICE_CLASS = "pv-100"

const tierRedirect = (tier: LicenseTier): string => `${ROUTES.APP}?${new URLSearchParams({ tier }).toString()}`

const listPrice = (locale: SupportedLocale, tier: LicenseTier): string =>
  new Intl.NumberFormat(locale, CURRENCY_FORMAT).format(TIER_PRICES[tier]).replaceAll(/\s/gu, " ")

const renderSummary = (tier: LicenseTier, locale: SupportedLocale = I18N.DEFAULT_LOCALE) =>
  renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale={locale} messages={getTestMessages(locale)} timeZone={I18N.DEFAULT_TIMEZONE}>
      <SignUpOrderSummary redirect={tierRedirect(tier)} />
    </IntlProvider>,
  )

afterEach(cleanup)

describe("SignUpOrderSummary", () => {
  it.each(LICENSE_TIERS)("heads the order with the name of %s, its price from TIER_PRICES and its one-time period", (tier) => {
    renderSummary(tier)

    const heading = screen.getByRole("heading", { level: 2, name: new RegExp(`^${pricing.tiers[tier].name}`, "u") })

    expect(screen.getByRole("region")).toContainElement(heading)
    expect(within(heading).getAllByText(listPrice(I18N.DEFAULT_LOCALE, tier)).at(0)).toHaveClass(LIST_PRICE_CLASS)
    expect(within(heading).getByText(pricing.tiers[tier].period)).toBeInTheDocument()
  })

  it.each(LICENSE_TIERS)("names the account as the first of the purchase steps and the price %s is paid once", (tier) => {
    renderSummary(tier)

    const step = screen.getByText(`Step ${String(PURCHASE_STEP.ACCOUNT)} of ${String(PURCHASE_STEP_COUNT)}:`)
    const steps = screen.getByText(/create your account, then pay/u)

    expect(steps).toContainElement(step)
    expect(steps).toHaveTextContent(/once with Polar\.$/u)
    expect(within(steps).getAllByText(listPrice(I18N.DEFAULT_LOCALE, tier)).at(0)).toHaveClass(LIST_PRICE_CLASS)
  })

  it("links the refund window from REFUND_TERMS to the refund policy", () => {
    renderSummary(LICENSE_TIER.COMPLETE)

    const link = screen.getByRole("link", { name: `Full refund within ${String(REFUND_TERMS.WITHDRAWAL_DAYS)} days` })

    expect(link).toHaveAttribute("href", ROUTES.REFUNDS)
    expect(screen.getByText(/if you haven’t generated a project or opened a paid lesson\.$/u)).toContainElement(link)
  })

  it("formats the price and names the tier in the visitor's locale", () => {
    renderSummary(LICENSE_TIER.CORE, "pl-PL")

    const heading = screen.getByRole("heading", { level: 2, name: new RegExp(`^${plPricing.tiers.core.name}`, "u") })

    expect(within(heading).getAllByText(listPrice("pl-PL", LICENSE_TIER.CORE)).at(0)).toHaveClass(LIST_PRICE_CLASS)
    expect(screen.getByRole("link", { name: `Pełny zwrot w ciągu ${String(REFUND_TERMS.WITHDRAWAL_DAYS)} dni` })).toHaveAttribute(
      "href",
      ROUTES.REFUNDS,
    )
  })

  it("draws its skeleton in the summary's card", () => {
    renderSummary(LICENSE_TIER.AGENCY)
    const { className } = screen.getByRole("region")

    cleanup()
    const { container } = renderWithRouter(<SignUpOrderSummaryPending />)

    expect(container.firstElementChild).toHaveClass(className, { exact: true })
    expect(container).toHaveTextContent("")
  })
})
