import "@tanstack/react-start/server-only"

import { getRequest } from "@tanstack/react-start/server"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { extractLocaleFromPath, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { ROUTES } from "~/src/routes"

const REFERER_HEADER = "referer"
const REDIRECT_PARAMETER = "redirect"

export const pageCallbackURL = (): string => {
  const request = getRequest()
  const page = URL.parse(request.headers.get(REFERER_HEADER) ?? "")

  if (page?.origin !== new URL(request.url).origin) {
    return ROUTES.AUTH_CALLBACK
  }

  const callback = localizePathname({ locale: extractLocaleFromPath(page.pathname) ?? I18N.DEFAULT_LOCALE, pathname: ROUTES.AUTH_CALLBACK })
  const redirect = page.searchParams.get(REDIRECT_PARAMETER)

  return redirect === null ? callback : `${callback}?${new URLSearchParams({ [REDIRECT_PARAMETER]: redirect }).toString()}`
}
