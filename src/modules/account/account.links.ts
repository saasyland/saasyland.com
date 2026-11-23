import "@tanstack/react-start/server-only"

import { getRequest } from "@tanstack/react-start/server"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { extractLocaleFromPath, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import * as ROUTES from "~/src/routes"

interface AccountEmailLinks {
  readonly locale: SupportedLocale
  readonly resetPasswordUrl: string
  readonly signInUrl: string
}

export const accountEmailLinks = (callbackURL: string): AccountEmailLinks => {
  const callback = new URL(callbackURL, getRequest().url)
  const locale = extractLocaleFromPath(callback.pathname) ?? I18N.DEFAULT_LOCALE
  const signInUrl = new URL(localizePathname({ locale, pathname: ROUTES.SIGN_IN }), getRequest().url)
  signInUrl.search = callback.search

  return {
    locale,
    resetPasswordUrl: new URL(localizePathname({ locale, pathname: ROUTES.FORGOT_PASSWORD }), getRequest().url).toString(),
    signInUrl: signInUrl.toString(),
  }
}
