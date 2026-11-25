import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ROUTES } from "~/src/routes"

const IGNORED_PATHS_REGEX = /^\/(?:api|_serverFn|media)(?:\/|$)/u
const LOCALE_SEGMENT_REGEX = /^\/(?<locale>[a-zA-Z-]+)(?:\/|$)/u
const HREF_PATHNAME_REGEX = /^[^?#]*/u

const CALLBACK_URL_PARAM = "callbackURL"

const SUPPORTED_LOCALE_SET = new Set<string>(I18N.SUPPORTED_LOCALES)

const PREFIXED_LOCALES = I18N.SUPPORTED_LOCALES.filter((locale) => locale !== I18N.DEFAULT_LOCALE)

const LOCALE_LANGUAGES = I18N.SUPPORTED_LOCALES.map((locale) => ({ language: new Intl.Locale(locale).language, locale }))

export const isSupportedLocale = (locale: string): locale is SupportedLocale => SUPPORTED_LOCALE_SET.has(locale)

export const shouldIgnorePath = (pathname: string): boolean => IGNORED_PATHS_REGEX.test(pathname)

const localeSegment = (pathname: string): string | undefined => LOCALE_SEGMENT_REGEX.exec(pathname)?.groups?.["locale"]

const withoutLocaleSegment = (pathname: string): string => pathname.replace(LOCALE_SEGMENT_REGEX, "/")

const extractLocalePrefix = (pathname: string): SupportedLocale | undefined => {
  const segment = localeSegment(pathname)

  return I18N.SUPPORTED_LOCALES.find((locale) => locale === segment)
}

export const extractLocaleFromPath = (pathname: string): SupportedLocale | undefined => {
  const segment = localeSegment(pathname)

  return PREFIXED_LOCALES.find((locale) => locale === segment)
}

export const extractLocaleFromCallbackURL = (url: string): SupportedLocale | undefined => {
  const link = new URL(url)
  const callback = URL.parse(link.searchParams.get(CALLBACK_URL_PARAM) ?? ROUTES.HOME, link)

  return extractLocaleFromPath(callback?.pathname ?? ROUTES.HOME)
}

export const deLocalizePathname = (pathname: string): string => {
  if (extractLocalePrefix(pathname) === undefined) {
    return pathname
  }

  return withoutLocaleSegment(pathname)
}

export const localizePathname = ({ locale, pathname }: { locale: SupportedLocale; pathname: string }): string => {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || shouldIgnorePath(pathname)) {
    return pathname
  }

  const basePath = deLocalizePathname(pathname)

  if (locale === I18N.DEFAULT_LOCALE) {
    return basePath
  }

  if (basePath === "/") {
    return `/${locale}`
  }

  return `/${locale}${basePath}`
}

export const localizeHref = ({ href, locale }: { href: string; locale: SupportedLocale }): string =>
  href.replace(HREF_PATHNAME_REGEX, (pathname) => localizePathname({ locale, pathname }))

export const canonicalizePathname = (pathname: string): string => {
  const segment = localeSegment(pathname)
  const match = LOCALE_LANGUAGES.find(({ language, locale }) => segment === locale || segment === language)

  if (match === undefined) {
    return pathname
  }

  const rest = withoutLocaleSegment(pathname)

  return shouldIgnorePath(rest) ? rest : localizePathname({ locale: match.locale, pathname: rest })
}

interface LocaleLink {
  readonly href: string
  readonly hrefLang?: string
  readonly rel: "alternate" | "canonical"
}

export const localeLinks = ({ origin, pathname }: { origin: string; pathname: string }): LocaleLink[] => {
  const basePath = deLocalizePathname(pathname)

  return [
    { href: `${origin}${pathname}`, rel: "canonical" },
    ...I18N.SUPPORTED_LOCALES.map((locale) => ({
      href: `${origin}${localizePathname({ locale, pathname: basePath })}`,
      hrefLang: locale,
      rel: "alternate" as const,
    })),
    { href: `${origin}${basePath}`, hrefLang: "x-default", rel: "alternate" },
  ]
}
