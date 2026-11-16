import { describe, expect, it } from "vite-plus/test"

import { CURRENCIES } from "~/src/modules/_core/constants/currency"
import { CURRENCY_FORMAT, DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"

describe("store currency", () => {
  it("formats prices in the store currency, rounded to its ISO 4217 minor unit", () => {
    const { currency, maximumFractionDigits } = new Intl.NumberFormat("en-US", CURRENCY_FORMAT).resolvedOptions()

    expect(currency).toBe(DEFAULT_CURRENCY_CODE)
    expect(maximumFractionDigits).toBe(CURRENCIES[DEFAULT_CURRENCY_CODE].exponent)
  })
})
