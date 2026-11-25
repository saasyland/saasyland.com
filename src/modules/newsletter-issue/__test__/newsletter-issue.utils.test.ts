import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { issueContent, issueLocale, issueParagraphs } from "~/src/modules/newsletter-issue/newsletter-issue.utils"

const POLISH = "pl-PL"
const GERMAN = "de-DE"

const TEXTS = {
  body: { [GERMAN]: "Nur der Text", [I18N.DEFAULT_LOCALE]: "First line\nsecond line\n\n\n  Next paragraph  \n \n", [POLISH]: "Treść" },
  subject: { [I18N.DEFAULT_LOCALE]: "  Issue one  ", [POLISH]: "Numer pierwszy" },
}

describe("issueParagraphs", () => {
  it("splits the body on empty lines, keeps the line breaks inside a paragraph and drops empty paragraphs", () => {
    expect(issueParagraphs(TEXTS.body[I18N.DEFAULT_LOCALE])).toStrictEqual(["First line\nsecond line", "Next paragraph"])
    expect(issueParagraphs("  \n\n ")).toStrictEqual([])
  })
})

describe("issueLocale", () => {
  it("keeps a language whose subject and body are both written", () => {
    expect(issueLocale(TEXTS, POLISH)).toBe(POLISH)
  })

  it("falls back to the default language when a language misses the subject or the body", () => {
    expect(issueLocale(TEXTS, GERMAN)).toBe(I18N.DEFAULT_LOCALE)
    expect(issueLocale(TEXTS, "ja-JP")).toBe(I18N.DEFAULT_LOCALE)
  })
})

describe("issueContent", () => {
  it("returns the language shown with its trimmed subject and its paragraphs", () => {
    expect(issueContent(TEXTS, GERMAN)).toStrictEqual({
      locale: I18N.DEFAULT_LOCALE,
      paragraphs: ["First line\nsecond line", "Next paragraph"],
      subject: "Issue one",
    })
    expect(issueContent(TEXTS, POLISH)).toStrictEqual({ locale: POLISH, paragraphs: ["Treść"], subject: "Numer pierwszy" })
  })

  it("returns an empty issue while nothing is written", () => {
    expect(issueContent({ body: {}, subject: {} }, POLISH)).toStrictEqual({ locale: I18N.DEFAULT_LOCALE, paragraphs: [], subject: "" })
  })
})
