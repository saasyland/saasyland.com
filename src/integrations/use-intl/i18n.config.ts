import { APP_DOMAIN } from "~/src/presentation/branding"

const COOKIE_NAME = `${APP_DOMAIN}_locale`

const SUPPORTED_LOCALES = ["en-US", "de-DE", "es-ES", "fr-FR", "it-IT", "ja-JP", "pl-PL", "pt-BR", "uk-UA"] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const DEFAULT_LOCALE: SupportedLocale = "en-US"
const DEFAULT_TIMEZONE = "UTC"

export const I18N = {
  COOKIE_NAME,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  SUPPORTED_LOCALES,
} as const
