import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import type { HEADER_NAVIGATION } from "~/src/data/navigation"

export const getHeaderHref =
  (locale: SupportedLocale) =>
  ({ hash, to }: (typeof HEADER_NAVIGATION)[number]): string =>
    [localizePathname({ locale, pathname: to }), hash].filter((part) => part !== undefined).join("#")
