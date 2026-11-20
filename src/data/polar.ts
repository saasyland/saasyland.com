import type { Environment } from "@polar-sh/sdk/2026-10"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export const POLAR_SERVER = {
  PRODUCTION: "production",
  SANDBOX: "sandbox",
} as const satisfies Record<string, Environment>

export const POLAR_DASHBOARD_HOSTS = {
  [POLAR_SERVER.PRODUCTION]: "polar.sh",
  [POLAR_SERVER.SANDBOX]: "sandbox.polar.sh",
} as const satisfies Record<Environment, string>

export const POLAR_ORGANIZATION_SLUG = "saasyland"

export const POLAR_CHECKOUT_DEFAULT_LANGUAGE = "en"

export const POLAR_CHECKOUT_LANGUAGES: Readonly<Partial<Record<SupportedLocale, string>>> = {
  "de-DE": "de",
  "en-US": POLAR_CHECKOUT_DEFAULT_LANGUAGE,
  "es-ES": "es",
  "fr-FR": "fr",
  "it-IT": "it",
  "ja-JP": "ja",
  "pl-PL": "pl",
  "pt-BR": "pt",
}

export const polarCheckoutLanguage = (locale: SupportedLocale): string =>
  POLAR_CHECKOUT_LANGUAGES[locale] ?? POLAR_CHECKOUT_DEFAULT_LANGUAGE

export const isPolarCheckoutTranslated = (locale: SupportedLocale): boolean => locale in POLAR_CHECKOUT_LANGUAGES
