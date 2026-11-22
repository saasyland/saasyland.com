import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { LOCALE_STATE, invalidLocales, isFilled, localeOfPath, localeStatuses } from "~/src/lib/localized-form"

const stateOf = (statuses: ReturnType<typeof localeStatuses>, locale: string) => statuses.find((status) => status.id === locale)?.state

describe("isFilled", () => {
  it("counts text and lists with something in them", () => {
    expect(isFilled({ "en-US": "Title" }, "en-US")).toBe(true)
    expect(isFilled({ "en-US": ["Ship it"] }, "en-US")).toBe(true)
  })

  it("treats blank text, blank items and a missing language as empty", () => {
    expect(isFilled({ "en-US": "  " }, "en-US")).toBe(false)
    expect(isFilled({ "en-US": ["", " "] }, "en-US")).toBe(false)
    expect(isFilled({ "en-US": "Title" }, "pl-PL")).toBe(false)
  })
})

describe("localeOfPath", () => {
  it("finds the language in a field path, inside lists too", () => {
    expect(localeOfPath("title.pl-PL")).toBe("pl-PL")
    expect(localeOfPath("outcomes.de-DE[2]")).toBe("de-DE")
    expect(localeOfPath("keyMoments[0].label.ja-JP")).toBe("ja-JP")
  })

  it("returns nothing for a path without a language", () => {
    expect(localeOfPath("slug")).toBeUndefined()
  })
})

describe("invalidLocales", () => {
  it("lists the languages whose fields show an error, in the supported order", () => {
    expect(
      invalidLocales({
        errorMap: {
          onChange: {
            slug: ["slugInvalid"],
            "summary.uk-UA": ["textTooLong"],
            "title.de-DE": ["textTooLong"],
            "title.pl-PL": ["textTooLong"],
          },
        },
        fieldMeta: {
          slug: { isBlurred: true },
          "summary.uk-UA": { isBlurred: true },
          "title.de-DE": { isBlurred: true },
          "title.en-US": { isBlurred: true },
          "title.pl-PL": { isBlurred: false },
        },
      }),
    ).toStrictEqual(["de-DE", "uk-UA"])
  })

  it("lists none while the form is valid", () => {
    expect(invalidLocales({ errorMap: {}, fieldMeta: { "title.de-DE": { isBlurred: true } } })).toStrictEqual([])
  })
})

describe("localeStatuses", () => {
  it("rates each language against the fields the default language fills", () => {
    const statuses = localeStatuses(
      [
        { "de-DE": "Titel", "en-US": "Title", "pl-PL": "Tytuł" },
        { "en-US": "Summary", "pl-PL": "Opis" },
        { "de-DE": "", "en-US": "" },
      ],
      ["fr-FR"],
    )

    expect(statuses.map((status) => status.id)).toStrictEqual(I18N.SUPPORTED_LOCALES)
    expect(stateOf(statuses, I18N.DEFAULT_LOCALE)).toBe(LOCALE_STATE.COMPLETE)
    expect(stateOf(statuses, "pl-PL")).toBe(LOCALE_STATE.COMPLETE)
    expect(stateOf(statuses, "de-DE")).toBe(LOCALE_STATE.PARTIAL)
    expect(stateOf(statuses, "ja-JP")).toBe(LOCALE_STATE.MISSING)
    expect(stateOf(statuses, "fr-FR")).toBe(LOCALE_STATE.INVALID)
  })

  it("leaves every language missing while the default language is empty", () => {
    const statuses = localeStatuses([{ "de-DE": "Titel", "en-US": "" }], [])

    expect(new Set(statuses.map((status) => status.state))).toStrictEqual(new Set([LOCALE_STATE.MISSING]))
  })
})
