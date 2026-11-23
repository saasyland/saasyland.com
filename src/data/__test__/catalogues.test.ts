import { expect, it } from "vite-plus/test"

import { COUNTRIES } from "~/src/data/countries"
import { CURRENCY_CODES } from "~/src/data/currencies"
import { LOCALES } from "~/src/data/locales"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"
import { TIMEZONES } from "~/src/data/timezones"

import countryNames from "~/messages/en-US/countries.json"
import currencyNames from "~/messages/en-US/currencies.json"
import localeNames from "~/messages/en-US/locales.json"
import timezoneNames from "~/messages/en-US/timezones.json"

const alphabetically = (left: string, right: string): number => left.localeCompare(right)

it.each([
  { catalogue: "countries", codes: COUNTRIES.map(({ alpha2 }) => alpha2), names: countryNames },
  { catalogue: "currencies", codes: CURRENCY_CODES, names: currencyNames },
  { catalogue: "locales", codes: LOCALES.map(({ code }) => code), names: localeNames },
  { catalogue: "timezones", codes: TIMEZONES.map(({ iana }) => iana), names: timezoneNames },
])("names exactly the $catalogue that the constants define", ({ codes, names }) => {
  expect(Object.keys(names).toSorted(alphabetically)).toStrictEqual(codes.toSorted(alphabetically))
})

it("counts the catalogues on the landing page from the constants", () => {
  expect(REPOSITORY_FACTS).toMatchObject({ countries: COUNTRIES.length, currencies: CURRENCY_CODES.length, timezones: TIMEZONES.length })
})
