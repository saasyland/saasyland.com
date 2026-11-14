import type { Formats } from "use-intl"

import { APP_DOMAIN } from "~/src/presentation/branding"

const COOKIE_NAME = `${APP_DOMAIN}_locale`

const SUPPORTED_LOCALES = ["en-US", "de-DE", "es-ES", "fr-FR", "it-IT", "ja-JP", "pl-PL", "pt-BR", "uk-UA"] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const DEFAULT_LOCALE: SupportedLocale = "en-US"
const DEFAULT_TIMEZONE = "UTC"
const CALENDAR_TIMEZONE = "UTC"

const FORMATS = {
  dateTime: {
    calendarDate: { day: "numeric", month: "short", timeZone: CALENDAR_TIMEZONE, year: "numeric" },
    calendarDay: { day: "numeric", month: "long", timeZone: CALENDAR_TIMEZONE },
    calendarMonth: { month: "short", timeZone: CALENDAR_TIMEZONE },
    date: { day: "numeric", month: "short", year: "numeric" },
    dateTime: { day: "numeric", hour: "numeric", minute: "2-digit", month: "short", timeZoneName: "short", year: "numeric" },
  },
} as const satisfies Formats

export const I18N = {
  COOKIE_NAME,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  FORMATS,
  SUPPORTED_LOCALES,
} as const
