import { describe, expect, it } from "vite-plus/test"

import { LOCALIZED_TEXT_MAX_LENGTH, localize, localizedTextSchema } from "~/src/modules/_core/utils/localized-text"

describe("localized text", () => {
  it("uses the translation and falls back to English when it is missing or empty", () => {
    const text = { "de-DE": "", "en-US": "Lesson", "pl-PL": "Lekcja" }

    expect(localize(text, "pl-PL")).toBe("Lekcja")
    expect(localize(text, "de-DE")).toBe("Lesson")
    expect(localize(text, "ja-JP")).toBe("Lesson")
    expect(localize({}, "ja-JP")).toBe("")
  })

  it("requires English and accepts only supported locales", () => {
    expect(localizedTextSchema.safeParse({ "en-US": " Lesson ", "pl-PL": "Lekcja" }).data).toStrictEqual({
      "en-US": "Lesson",
      "pl-PL": "Lekcja",
    })
    expect(localizedTextSchema.safeParse({ "pl-PL": "Lekcja" }).error?.issues[0]).toMatchObject({
      message: "defaultLocaleRequired",
      path: ["en-US"],
    })
    expect(localizedTextSchema.safeParse({ "en-US": "x".repeat(LOCALIZED_TEXT_MAX_LENGTH + 1) }).error?.issues[0]?.message).toBe(
      "textTooLong",
    )
    expect(localizedTextSchema.safeParse({ "en-US": "  " }).success).toBe(false)
    expect(localizedTextSchema.safeParse({ "en-GB": "Lesson", "en-US": "Lesson" }).success).toBe(false)
  })
})
