import { type JSX, type ReactNode, useMemo } from "react"

import { useSuspenseQueries } from "@tanstack/react-query"
import { useMatches } from "@tanstack/react-router"
import type { AbstractIntlMessages } from "use-intl"
import { IntlProvider } from "use-intl/react"

import { type NamespaceEntry, ROOT_NAMESPACES, buildMessageTree, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { DEFAULT_TIMEZONE_CODE } from "~/src/modules/_core/constants/timezone.default"

export const TranslationsProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const locale = getCurrentLocale()
  const matches = useMatches()

  const namespaces = useMemo(
    () => [...new Set([...ROOT_NAMESPACES, ...matches.flatMap((match) => match.staticData.namespaces ?? [])])],
    [matches],
  )

  const messages = useSuspenseQueries({
    combine: (results) => buildMessageTree(results.map((result) => result.data)),
    queries: namespaces.map((namespace) =>
      Object.assign(messagesQueryOptions({ locale, namespace }), {
        select: (namespaceMessages: AbstractIntlMessages): NamespaceEntry => [namespace, namespaceMessages],
      }),
    ),
  })

  return (
    <IntlProvider locale={locale} messages={messages} timeZone={DEFAULT_TIMEZONE_CODE}>
      {children}
    </IntlProvider>
  )
}
