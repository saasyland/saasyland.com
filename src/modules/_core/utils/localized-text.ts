import zod from "zod/v4"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

export const LOCALIZED_TEXT_MAX_LENGTH = 2000

export type LocalizedText = Partial<Record<SupportedLocale, string>>

export const localizedTextSchema = zod
  .partialRecord(localeField, zod.string().trim().max(LOCALIZED_TEXT_MAX_LENGTH))
  .refine((text) => (text[I18N.DEFAULT_LOCALE] ?? "").length > 0, { message: "defaultLocaleRequired" })

export const localize = (text: LocalizedText, locale: SupportedLocale): string => {
  const translation = text[locale]

  if (translation !== undefined && translation.length > 0) {
    return translation
  }

  return text[I18N.DEFAULT_LOCALE] ?? ""
}
