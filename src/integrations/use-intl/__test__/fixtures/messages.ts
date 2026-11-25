import { type AbstractIntlMessages, type Messages, createTranslator } from "use-intl"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { type NamespaceEntry, buildMessageTree, toNamespace } from "~/src/integrations/use-intl/i18n.messages"

import type { SiteEntry } from "~/src/data/navigation.constants"

const fixtures = import.meta.glob<AbstractIntlMessages>("../../../../../messages/*/*.json", { eager: true, import: "default" })

export const getTestMessages = (locale: SupportedLocale): AbstractIntlMessages =>
  buildMessageTree(
    Object.entries(fixtures)
      .filter(([path]) => path.includes(`/${locale}/`))
      .map(([path, messages]): NamespaceEntry => [toNamespace(path), messages]),
  )

export const getNavigationLabel = (locale: SupportedLocale): ((entry: Pick<SiteEntry, "label" | "signedIn">) => string) => {
  const t = createTranslator<Messages>({ locale, messages: getTestMessages(locale) })

  return (entry) => [entry, ...(entry.signedIn === undefined ? [] : [entry.signedIn])].map(({ label }) => t(label)).join("")
}
