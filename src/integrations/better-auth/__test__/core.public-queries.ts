import { executeQuery } from "~/src/platform/testing/lib/query"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

export const CORE_PUBLIC_QUERIES = {
  "src/integrations/use-intl/i18n.messages.ts": () =>
    executeQuery(messagesQueryOptions({ locale: I18N.DEFAULT_LOCALE, namespace: "common" })),
}
