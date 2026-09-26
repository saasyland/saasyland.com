import { describe, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

const isNestedRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const flattenMessageKeys = (value: unknown, prefix = ""): string[] => {
  if (!isNestedRecord(value)) {
    return prefix.length > 0 ? [prefix] : []
  }

  return Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix.length > 0 ? `${prefix}.${key}` : key

    if (isNestedRecord(nested)) {
      return flattenMessageKeys(nested, path)
    }

    return [path]
  })
}

describe("load locale messages from dir component", () => {
  it("loads and nests namespace files for the default locale", () => {
    expect.hasAssertions()
    const messages = getTestMessages(I18N.DEFAULT_LOCALE)
    expect(messages).toHaveProperty(["pages", "landing", "hero", "ctaPrimary"], expect.any(String))
    expect(messages).toHaveProperty(["auth", "form", "placeholders", "email"], expect.any(String))
  })

  it("returns equivalent messages for repeated loads", () => {
    expect.hasAssertions()
    const first = getTestMessages(I18N.DEFAULT_LOCALE)
    const second = getTestMessages(I18N.DEFAULT_LOCALE)
    expect(second).toStrictEqual(first)
  })

  it("keeps translation keys in sync across locales", () => {
    expect.hasAssertions()
    const sourceKeys = flattenMessageKeys(getTestMessages(I18N.DEFAULT_LOCALE))
    const nonDefaultLocales = I18N.SUPPORTED_LOCALES.filter((locale) => locale !== I18N.DEFAULT_LOCALE)
    for (const locale of nonDefaultLocales) {
      const localeKeys = flattenMessageKeys(getTestMessages(locale))
      expect(localeKeys.toSorted()).toStrictEqual(sourceKeys.toSorted())
    }
  })
})
