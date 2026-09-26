import type { LocaleCode } from "~/src/modules/_core/constants/locale"

import { APP_DOMAIN } from "~/src/presentation/branding"

const COOKIE_NAME = `${APP_DOMAIN}_locale`

const DE_DE = "de-DE" satisfies LocaleCode
const EN_US = "en-US" satisfies LocaleCode
const ES_ES = "es-ES" satisfies LocaleCode
const FR_FR = "fr-FR" satisfies LocaleCode
const IT_IT = "it-IT" satisfies LocaleCode
const JA_JP = "ja-JP" satisfies LocaleCode
const PL_PL = "pl-PL" satisfies LocaleCode
const PT_BR = "pt-BR" satisfies LocaleCode
const UK_UA = "uk-UA" satisfies LocaleCode

const SUPPORTED_LOCALES = [EN_US, DE_DE, ES_ES, FR_FR, IT_IT, JA_JP, PL_PL, PT_BR, UK_UA] as const
const DEFAULT_LOCALE = EN_US
const DEFAULT_TIMEZONE = "UTC"

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const I18N = {
  COOKIE_NAME,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  SUPPORTED_LOCALES,
} as const
