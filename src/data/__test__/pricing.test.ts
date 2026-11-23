import { describe, expect, it } from "vite-plus/test"

import { CURRENCIES } from "~/src/data/currencies"
import { CURRENCY_FORMAT, DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

describe("store currency", () => {
  it("formats prices in the store currency, rounded to its ISO 4217 minor unit", () => {
    const { currency, maximumFractionDigits } = new Intl.NumberFormat("en-US", CURRENCY_FORMAT).resolvedOptions()

    expect(currency).toBe(DEFAULT_CURRENCY_CODE)
    expect(maximumFractionDigits).toBe(CURRENCIES[DEFAULT_CURRENCY_CODE].exponent)
  })
})
