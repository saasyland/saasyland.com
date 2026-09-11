import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import globalsCss from "~/src/presentation/styles/globals.css?url"

export const DOCUMENT_STYLESHEET = { href: globalsCss, rel: "stylesheet" }

const GEIST_LATIN = {
  as: "font",
  crossOrigin: "anonymous" as const,
  href: "/fonts/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2",
  rel: "preload",
  type: "font/woff2",
}
const GEIST_MONO_LATIN = {
  as: "font",
  crossOrigin: "anonymous" as const,
  href: "/fonts/797e433ab948586e-s.0r6juujl39pe6.woff2",
  rel: "preload",
  type: "font/woff2",
}
const GEIST_LATIN_EXT = {
  as: "font",
  crossOrigin: "anonymous" as const,
  href: "/fonts/7178b3e590c64307-s.p.21jp631_3pja2.woff2",
  rel: "preload",
  type: "font/woff2",
}
const GEIST_CYRILLIC = {
  as: "font",
  crossOrigin: "anonymous" as const,
  href: "/fonts/8a480f0b521d4e75-s.1qq4vpdcun5oj.woff2",
  rel: "preload",
  type: "font/woff2",
}

export const fontPreloads = (locale: SupportedLocale) => {
  const fonts = [GEIST_LATIN, GEIST_MONO_LATIN]
  if (locale === "pl-PL") {
    fonts.push(GEIST_LATIN_EXT)
  } else if (locale === "uk-UA") {
    fonts.push(GEIST_CYRILLIC)
  }
  return fonts
}
