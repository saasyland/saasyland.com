import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

export const LOCALE_STATE = {
  COMPLETE: "complete",
  INVALID: "invalid",
  MISSING: "missing",
  PARTIAL: "partial",
} as const

export type LocaleState = (typeof LOCALE_STATE)[keyof typeof LOCALE_STATE]

export type LocalizedValue = Partial<Record<SupportedLocale, string | readonly string[]>>

export type LocalizedEntry = LocalizedValue | readonly LocalizedValue[]

export interface LocaleStatus {
  readonly id: SupportedLocale
  readonly state: LocaleState
}

export interface FormErrors {
  readonly errorMap: { readonly onChange?: unknown }
  readonly fieldMeta: Readonly<Partial<Record<string, { readonly isBlurred: boolean }>>>
}

const PATH_SEPARATOR = /[.[\]]/u

export const isFilled = (value: LocalizedValue, locale: SupportedLocale): boolean => {
  const text = value[locale]
  if (typeof text === "string") {
    return text.trim().length > 0
  }
  return text?.some((item) => item.trim().length > 0) ?? false
}

export const localeOfPath = (path: string): SupportedLocale | undefined =>
  path.split(PATH_SEPARATOR).find((segment): segment is SupportedLocale => isSupportedLocale(segment))

export const invalidLocales = ({ errorMap, fieldMeta }: FormErrors): readonly SupportedLocale[] => {
  const paths = errorMap.onChange instanceof Object ? Object.keys(errorMap.onChange) : []
  const invalid = new Set(paths.filter((path) => fieldMeta[path]?.isBlurred === true).map((path) => localeOfPath(path)))
  return I18N.SUPPORTED_LOCALES.filter((locale) => invalid.has(locale))
}

const stateOf = (locale: SupportedLocale, sources: readonly LocalizedValue[], invalid: readonly SupportedLocale[]): LocaleState => {
  if (invalid.includes(locale)) {
    return LOCALE_STATE.INVALID
  }
  const filled = sources.filter((value) => isFilled(value, locale)).length
  if (filled === 0) {
    return LOCALE_STATE.MISSING
  }
  return filled === sources.length ? LOCALE_STATE.COMPLETE : LOCALE_STATE.PARTIAL
}

export const localeStatuses = (values: readonly LocalizedValue[], invalid: readonly SupportedLocale[]): readonly LocaleStatus[] => {
  const sources = values.filter((value) => isFilled(value, I18N.DEFAULT_LOCALE))
  return I18N.SUPPORTED_LOCALES.map((id) => ({ id, state: stateOf(id, sources, invalid) }))
}
