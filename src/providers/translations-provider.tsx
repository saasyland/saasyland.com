import { type JSX, type ReactNode, useMemo } from "react"

import { useQuery, useSuspenseQueries } from "@tanstack/react-query"
import { useMatches } from "@tanstack/react-router"
import { IntlProvider } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { ROOT_NAMESPACES, buildMessageTree, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

export const TranslationsProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const locale = getCurrentLocale()
  const matches = useMatches()
  const session = useQuery({ ...getCurrentSessionQuery, enabled: false }).data

  const namespaces = useMemo(
    () => [...new Set([...ROOT_NAMESPACES, ...matches.flatMap((match) => match.staticData.namespaces ?? [])])],
    [matches],
  )

  const messages = useSuspenseQueries({
    combine: (results) => buildMessageTree(results.map((result) => result.data)),
    queries: namespaces.map((namespace) => messagesQueryOptions({ locale, namespace })),
  })

  return (
    <IntlProvider formats={I18N.FORMATS} locale={locale} messages={messages} timeZone={session?.user.timezone ?? I18N.DEFAULT_TIMEZONE}>
      {children}
    </IntlProvider>
  )
}
