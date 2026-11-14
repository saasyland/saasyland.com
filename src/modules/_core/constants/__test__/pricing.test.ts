import { describe, expect, it } from "vite-plus/test"

import { CURRENCIES } from "~/src/modules/_core/constants/currency"
import {
  CURRENCY_FORMAT,
  DEFAULT_CURRENCY_CODE,
  getPppMultiplier,
  getPppPercentOff,
  pppMultiplierKey,
} from "~/src/modules/_core/constants/pricing"

const formatPrice = (amount: number): string => new Intl.NumberFormat("en-US", CURRENCY_FORMAT).format(amount)

describe("store currency", () => {
  it("formats prices in the store currency, rounded to its ISO 4217 minor unit", () => {
    const { currency, maximumFractionDigits } = new Intl.NumberFormat("en-US", CURRENCY_FORMAT).resolvedOptions()

    expect(currency).toBe(DEFAULT_CURRENCY_CODE)
    expect(maximumFractionDigits).toBe(CURRENCIES[DEFAULT_CURRENCY_CODE].exponent)
  })
})

describe("regional pricing", () => {
  it.each([
    { country: "PT", multiplier: 0.8, percentOff: 20, price: "$239.20" },
    { country: "pl", multiplier: 0.7, percentOff: 30, price: "$209.30" },
    { country: "IN", multiplier: 0.6, percentOff: 40, price: "$179.40" },
    { country: "UA", multiplier: 0.5, percentOff: 50, price: "$149.50" },
  ])("charges exactly the discount percentage on the $299 price for $country", ({ country, multiplier, percentOff, price }) => {
    expect(getPppMultiplier(country)).toBe(multiplier)
    expect(getPppPercentOff(country)).toBe(percentOff)
    expect(pppMultiplierKey(country)).toBe(100 - percentOff)
    expect(formatPrice(299 * multiplier)).toBe(price)
  })

  it.each([undefined, "US", "XX"])("preserves the original price for a full-price or unavailable country: %j", (country) => {
    const multiplier = getPppMultiplier(country)

    expect(multiplier).toBe(1)
    expect(getPppPercentOff(country)).toBe(0)
    expect(pppMultiplierKey(country)).toBe(100)
    expect(formatPrice(295 * multiplier)).toBe("$295")
  })
})
