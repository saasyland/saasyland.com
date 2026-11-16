import { describe, expect, it } from "vite-plus/test"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import {
  canonicalizePathname,
  deLocalizePathname,
  extractLocaleFromCallbackURL,
  localizeHref,
  localizePathname,
} from "~/src/integrations/use-intl/i18n.paths"
describe("router locale rewrites", () => {
  it("canonicalizes the short aliases used by existing links", () => {
    expect(canonicalizePathname("/pl/docs")).toBe("/pl-PL/docs")
    expect(canonicalizePathname("/en/docs")).toBe("/docs")
  })
  it("round-trips the same internal route through each locale", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      expect(deLocalizePathname(localizePathname({ locale, pathname: "/docs" }))).toBe("/docs")
    }
  })
})

it("keeps external and fragment links unchanged", () => {
  for (const pathname of ["https://example.com", "//example.com", "#pricing", "mailto:test@example.com", "/api/search"]) {
    expect(localizePathname({ locale: "pl-PL", pathname })).toBe(pathname)
  }
})
it.each<{ expected: string; href: string; locale: SupportedLocale }>([
  { expected: "/pl-PL#pricing", href: "/#pricing", locale: "pl-PL" },
  { expected: "/#pricing", href: "/#pricing", locale: I18N.DEFAULT_LOCALE },
  { expected: "/de-DE/docs?tab=cli#install", href: "/docs?tab=cli#install", locale: "de-DE" },
  { expected: "/uk-UA/blog?page=2", href: "/pl-PL/blog?page=2", locale: "uk-UA" },
  { expected: "#pricing", href: "#pricing", locale: "pl-PL" },
  { expected: "/api/search?q=a#top", href: "/api/search?q=a#top", locale: "pl-PL" },
  { expected: "https://example.com/?a#b", href: "https://example.com/?a#b", locale: "pl-PL" },
])("localizes only the path of $href in $locale, keeping its query and fragment", ({ expected, href, locale }) => {
  expect(localizeHref({ href, locale })).toBe(expected)
})
it("normalizes locale roots and prefixed API links", () => {
  expect(deLocalizePathname("/pl-PL")).toBe("/")
  expect(canonicalizePathname("/pl-PL")).toBe("/pl-PL")
  expect(canonicalizePathname("/pl")).toBe("/pl-PL")
  expect(canonicalizePathname("/pl-PL/api/search")).toBe("/api/search")
})
it.each([
  { locale: "pl-PL", url: "https://example.com/api/auth/verify-email?token=t&callbackURL=%2Fpl-PL%2Fapp" },
  { locale: "de-DE", url: "https://example.com/api/auth/verify-email?token=t&callbackURL=https%3A%2F%2Fexample.com%2Fde-DE%2Fapp" },
  { locale: undefined, url: "https://example.com/api/auth/reset-password/t?callbackURL=%2Fauth%2Freset-password" },
  { locale: undefined, url: "https://example.com/api/auth/reset-password/t?callbackURL=" },
  { locale: undefined, url: "https://example.com/api/auth/reset-password/t?callbackURL=http%3A%2F%2F%5B%2Fpl-PL" },
  { locale: undefined, url: "https://example.com/pl-PL/api/auth/verify-email?token=t" },
])("reads $locale from the page an auth link returns to: $url", ({ locale, url }) => {
  expect(extractLocaleFromCallbackURL(url)).toBe(locale)
})
