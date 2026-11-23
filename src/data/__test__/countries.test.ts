import { describe, expect, it } from "vite-plus/test"

import { COUNTRIES, type CountryCode } from "~/src/data/countries"
import { CURRENCIES } from "~/src/data/currencies"

describe("country catalog", () => {
  it("keeps alpha-2 codes unique and uppercase", () => {
    expect.hasAssertions()
    const codes = COUNTRIES.map((country) => country.alpha2)
    expect(new Set(codes).size).toBe(COUNTRIES.length)
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/u)
    }
  })

  it("references only currencies that exist in the currency catalog", () => {
    expect.hasAssertions()
    for (const country of COUNTRIES) {
      expect(CURRENCIES).toHaveProperty(country.currency)
    }
  })

  it("contains the United States with its ISO identifiers", () => {
    expect.hasAssertions()
    const us: CountryCode = "US"
    const entry = COUNTRIES.find((country) => country.alpha2 === us)
    expect(entry).toMatchObject({ alpha3: "USA", currency: "USD", numeric: "840" })
  })
})
