import type { I18N } from "~/src/integrations/use-intl/i18n.config"

declare module "use-intl" {
  interface AppConfig {
    Formats: typeof I18N.FORMATS
  }
}
