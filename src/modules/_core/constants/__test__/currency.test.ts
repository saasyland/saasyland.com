import { describe, expect, it } from "vite-plus/test"

import { CURRENCIES, CURRENCY_CODES, toMinorUnits } from "~/src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"

describe("currency catalog", () => {
  it("derives one code per catalog entry, uppercase ISO 4217", () => {
    expect.hasAssertions()
    expect(CURRENCY_CODES).toHaveLength(Object.keys(CURRENCIES).length)
    for (const code of CURRENCY_CODES) {
      expect(code).toMatch(/^[A-Z]{3}$/u)
    }
  })

  it("contains the store currency", () => {
    expect(CURRENCY_CODES).toContain(DEFAULT_CURRENCY_CODE)
  })

  it.each([
    { amount: 174.3, currency: "USD", minorUnits: 17_430 },
    { amount: 1234.5, currency: "JPY", minorUnits: 1235 },
    { amount: 12.3456, currency: "BHD", minorUnits: 12_346 },
  ] as const)("converts $amount $currency to $minorUnits minor units by the ISO 4217 exponent", ({ amount, currency, minorUnits }) => {
    expect(toMinorUnits(amount, currency)).toBe(minorUnits)
  })
})
