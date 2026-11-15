import { render } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"

import { ADMIN_ANNUAL_PASS_SAVINGS, ADMIN_PRICING_MODELS, ADMIN_PRICING_STATS } from "~/src/data/admin-payments"

import { PricingModelsGrid } from "~/src/presentation/components/custom/admin/pricing-models/models-grid"
import { PricingModelStats } from "~/src/presentation/components/custom/admin/pricing-models/stats"

const renderPricingModels = (locale: SupportedLocale) =>
  render(
    <IntlProvider formats={I18N.FORMATS} locale={locale} messages={getTestMessages(locale)} timeZone={I18N.DEFAULT_TIMEZONE}>
      <PricingModelStats />
      <PricingModelsGrid />
    </IntlProvider>,
  )

describe("pricing models", () => {
  it.each(I18N.SUPPORTED_LOCALES)("shows every amount in the store currency, formatted for %s", (locale) => {
    const { container } = renderPricingModels(locale)
    const currency = new Intl.NumberFormat(locale, CURRENCY_FORMAT)

    for (const { price } of ADMIN_PRICING_MODELS) {
      expect(container.textContent).toContain(currency.format(price))
    }
    expect(container.textContent).toContain(currency.format(ADMIN_ANNUAL_PASS_SAVINGS))
  })

  it("formats each statistic as an amount or a count", () => {
    const { container } = renderPricingModels(I18N.DEFAULT_LOCALE)

    for (const { format, value } of ADMIN_PRICING_STATS) {
      expect(container.textContent).toContain(new Intl.NumberFormat(I18N.DEFAULT_LOCALE, format).format(value))
    }
  })
})
