import * as zod from "zod"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { MIN_FIELD_LENGTH, localeField } from "~/src/modules/_core/utils/zod-fields"

export const LOCALIZED_TEXT_MAX_LENGTH = 2000

export const LOCALIZED_LIST_MAX_ITEMS = 12

export const LOCALIZED_LIST_ITEM_MAX_LENGTH = 200

export type LocalizedText = Partial<Record<SupportedLocale, string>>

export type LocalizedList = Partial<Record<SupportedLocale, string[]>>

export const localizedTextSchema = zod
  .partialRecord(localeField, zod.string().trim().max(LOCALIZED_TEXT_MAX_LENGTH, { message: "textTooLong" }))
  .refine((text) => (text[I18N.DEFAULT_LOCALE] ?? "").length > 0, { message: "defaultLocaleRequired", path: [I18N.DEFAULT_LOCALE] })

export const optionalLocalizedTextSchema = zod.partialRecord(
  localeField,
  zod.string().trim().max(LOCALIZED_TEXT_MAX_LENGTH, { message: "textTooLong" }),
)

export const localizedListSchema = zod.partialRecord(
  localeField,
  zod
    .array(
      zod
        .string()
        .trim()
        .min(MIN_FIELD_LENGTH, { message: "itemRequired" })
        .max(LOCALIZED_LIST_ITEM_MAX_LENGTH, { message: "itemTooLong" }),
    )
    .max(LOCALIZED_LIST_MAX_ITEMS, { message: "tooManyItems" }),
)

export const localize = (text: LocalizedText, locale: SupportedLocale): string => {
  const translation = text[locale]

  if (translation !== undefined && translation.length > 0) {
    return translation
  }

  return text[I18N.DEFAULT_LOCALE] ?? ""
}

export const localizeList = (list: LocalizedList, locale: SupportedLocale): string[] => {
  const translation = list[locale]

  if (translation !== undefined && translation.length > 0) {
    return translation
  }

  return list[I18N.DEFAULT_LOCALE] ?? []
}
