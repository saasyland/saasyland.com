import type { AbstractIntlMessages } from "use-intl"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { type NamespaceEntry, buildMessageTree, toNamespace } from "~/src/integrations/use-intl/i18n.messages"

const fixtures = import.meta.glob<AbstractIntlMessages>("../../../../../messages/*/*.json", { eager: true, import: "default" })

export const getTestMessages = (locale: SupportedLocale): AbstractIntlMessages =>
  buildMessageTree(
    Object.entries(fixtures)
      .filter(([path]) => path.includes(`/${locale}/`))
      .map(([path, messages]): NamespaceEntry => [toNamespace(path), messages]),
  )
