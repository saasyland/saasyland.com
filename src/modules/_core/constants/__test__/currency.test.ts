import { describe, expect, it } from "vite-plus/test"

import { CURRENCIES, CURRENCY_CODES } from "~/src/modules/_core/constants/currency"
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
})
