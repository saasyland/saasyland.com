import type { LocationRewrite } from "@tanstack/react-router"
import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizePathname, extractLocaleFromPath, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

const withPathname = ({ pathname, url }: { pathname: string; url: URL }): URL => {
  const rewritten = new URL(url)
  rewritten.pathname = pathname

  return rewritten
}

export const getCurrentLocale = createIsomorphicFn()
  .server((): SupportedLocale => extractLocaleFromPath(new URL(getRequest().url).pathname) ?? I18N.DEFAULT_LOCALE)
  .client((): SupportedLocale => extractLocaleFromPath(globalThis.location.pathname) ?? I18N.DEFAULT_LOCALE)

export const localizeUrl = (url: URL): URL =>
  withPathname({ pathname: localizePathname({ locale: getCurrentLocale(), pathname: url.pathname }), url })

export const deLocalizeUrl = (url: URL): URL => withPathname({ pathname: deLocalizePathname(url.pathname), url })

export const LOCALE_REWRITE: LocationRewrite = {
  input: ({ url }) => deLocalizeUrl(url),
  output: ({ url }) => localizeUrl(url),
}
