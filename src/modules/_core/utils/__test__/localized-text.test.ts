import { describe, expect, it } from "vite-plus/test"

import {
  LOCALIZED_LIST_ITEM_MAX_LENGTH,
  LOCALIZED_LIST_MAX_ITEMS,
  LOCALIZED_TEXT_MAX_LENGTH,
  localize,
  localizeList,
  localizedListSchema,
  localizedTextSchema,
  optionalLocalizedTextSchema,
} from "~/src/modules/_core/utils/localized-text"

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

describe("optional localized text", () => {
  it("accepts an empty text and limits each translation", () => {
    expect(optionalLocalizedTextSchema.parse({})).toStrictEqual({})
    expect(optionalLocalizedTextSchema.parse({ "pl-PL": " Wstęp " })).toStrictEqual({ "pl-PL": "Wstęp" })
    expect(optionalLocalizedTextSchema.safeParse({ "en-US": "x".repeat(LOCALIZED_TEXT_MAX_LENGTH + 1) }).error?.issues[0]?.message).toBe(
      "textTooLong",
    )
  })
})

describe("localized lists", () => {
  it("uses the visitor's list and falls back to the English one when it is missing or empty", () => {
    const list = { "de-DE": [], "en-US": ["Ship it"], "pl-PL": ["Wdróż"] }

    expect(localizeList(list, "pl-PL")).toStrictEqual(["Wdróż"])
    expect(localizeList(list, "de-DE")).toStrictEqual(["Ship it"])
    expect(localizeList(list, "ja-JP")).toStrictEqual(["Ship it"])
    expect(localizeList({}, "ja-JP")).toStrictEqual([])
  })

  it("trims each item and refuses empty, long or too many items", () => {
    expect(localizedListSchema.parse({ "en-US": [" Ship it "] })).toStrictEqual({ "en-US": ["Ship it"] })
    expect(localizedListSchema.safeParse({ "en-US": [" "] }).error?.issues[0]?.message).toBe("itemRequired")
    expect(localizedListSchema.safeParse({ "en-US": ["x".repeat(LOCALIZED_LIST_ITEM_MAX_LENGTH + 1)] }).error?.issues[0]?.message).toBe(
      "itemTooLong",
    )
    expect(
      localizedListSchema.safeParse({ "en-US": Array.from({ length: LOCALIZED_LIST_MAX_ITEMS + 1 }, () => "Item") }).error?.issues[0]
        ?.message,
    ).toBe("tooManyItems")
  })
})
