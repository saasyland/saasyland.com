import { type JSX, type ReactNode, useMemo } from "react"

import { useSuspenseQueries } from "@tanstack/react-query"
import { useMatches } from "@tanstack/react-router"
import { IntlProvider } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { ROOT_NAMESPACES, buildMessageTree, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { TIME_ZONE_HOOKS } from "~/src/areas/browser"

export const TranslationsProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const locale = getCurrentLocale()
  const matches = useMatches()
  const [timeZone = I18N.DEFAULT_TIMEZONE] = TIME_ZONE_HOOKS.map((useTimeZone) => useTimeZone())

  const namespaces = useMemo(
    () => [...new Set([...ROOT_NAMESPACES, ...matches.flatMap((match) => match.staticData.namespaces ?? [])])],
    [matches],
  )

  const messages = useSuspenseQueries({
    combine: (results) => buildMessageTree(results.map((result) => result.data)),
    queries: namespaces.map((namespace) => messagesQueryOptions({ locale, namespace })),
  })

  return (
    <IntlProvider formats={I18N.FORMATS} locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </IntlProvider>
  )
}
