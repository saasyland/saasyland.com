import { expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  POLAR_CHECKOUT_DEFAULT_LANGUAGE,
  POLAR_SERVER,
  isPolarCheckoutTranslated,
  polarCheckoutLanguage,
  polarCheckoutOrigin,
} from "~/src/data/polar"

it("opens Polar's checkout in the language of each locale Polar translates, and in English for the others", () => {
  expect(Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, polarCheckoutLanguage(locale)]))).toStrictEqual({
    "de-DE": "de",
    "en-US": "en",
    "es-ES": "es",
    "fr-FR": "fr",
    "it-IT": "it",
    "ja-JP": "ja",
    "pl-PL": "pl",
    "pt-BR": "pt",
    "uk-UA": POLAR_CHECKOUT_DEFAULT_LANGUAGE,
  })
  expect(I18N.SUPPORTED_LOCALES.filter((locale) => !isPolarCheckoutTranslated(locale))).toStrictEqual(["uk-UA"])
})

it("serves each Polar server's checkout from the one origin Polar's embed script accepts messages from", () => {
  expect(polarCheckoutOrigin(POLAR_SERVER.PRODUCTION)).toBe("https://polar.sh")
  expect(polarCheckoutOrigin(POLAR_SERVER.SANDBOX)).toBe("https://sandbox.polar.sh")
})
