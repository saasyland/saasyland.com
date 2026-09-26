import { defineI18n } from "fumadocs-core/i18n"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

export const i18n = defineI18n({
  defaultLanguage: I18N.DEFAULT_LOCALE,
  fallbackLanguage: I18N.DEFAULT_LOCALE,
  hideLocale: "always",
  languages: [...I18N.SUPPORTED_LOCALES],
  parser: "dot",
})
