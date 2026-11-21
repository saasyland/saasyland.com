import { describe, expect, it } from "vite-plus/test"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import {
  PPP_KEYS,
  PPP_PERCENTS_OFF,
  getPppMultiplier,
  getPppPercentOff,
  pppMultiplierKey,
  regionalPrice,
} from "~/src/modules/license/license.pricing"

const formatPrice = (amount: number): string => new Intl.NumberFormat("en-US", CURRENCY_FORMAT).format(amount)

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

  it("lists the percentage off of each regional band", () => {
    expect(PPP_PERCENTS_OFF).toStrictEqual([20, 30, 40, 50])
  })

  it("rounds a regional price down to whole dollars and keeps the full price whole", () => {
    expect(PPP_KEYS.map((key) => regionalPrice(249, key))).toStrictEqual([249, 199, 174, 149, 124])
    expect(PPP_KEYS.map((key) => regionalPrice(399, key))).toStrictEqual([399, 319, 279, 239, 199])
  })
})
