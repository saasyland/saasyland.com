import type { JSX } from "react"

import { createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"

import { ACCOUNT_DELETION_NOTICES } from "~/src/data/account-deletion"
import { SETTINGS_TAB, SETTINGS_TABS, settingsSearchSchema } from "~/src/data/auth"

import { onlyDeclaredSearch } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { AppSettingsPending } from "~/src/presentation/components/custom/app/auth-pending"
import { PreferencesCard } from "~/src/presentation/components/custom/preferences-card"
import { ConnectedAccountsCard } from "~/src/presentation/components/custom/settings/connected-accounts-card"
import { DeleteAccountCard } from "~/src/presentation/components/custom/settings/delete-account-card"
import { EmailCard } from "~/src/presentation/components/custom/settings/email-card"
import { PasswordCard } from "~/src/presentation/components/custom/settings/password-card"
import { SessionsCard } from "~/src/presentation/components/custom/settings/sessions-card"
import { TwoFactorCard } from "~/src/presentation/components/custom/settings/two-factor-card"

import { ROUTES } from "~/src/routes"

const SettingsPage = (): JSX.Element => {
  const t = useTranslations()

  const { tab } = Route.useSearch()

  return (
    <div className="flex w-full flex-col gap-8 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-statement font-semibold text-foreground">{t("pages.app.settings.metadata.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("pages.app.settings.metadata.description")}</p>
      </header>
      <Tabs className="w-full gap-6" selectedKey={tab}>
        <div className="border-b border-border">
          <TabsList className="no-scrollbar justify-start gap-6 overflow-x-auto" variant="line">
            {SETTINGS_TABS.map((id) => (
              <TabsTrigger className="flex-none px-0 text-sm" href={`${ROUTES.APP_SETTINGS}?tab=${id}`} id={id} key={id}>
                {t(`auth.security.tabs.${id}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent className="flex flex-col gap-6 outline-none" id={SETTINGS_TAB.GENERAL}>
          <PreferencesCard />
          <EmailCard />
          <DeleteAccountCard />
        </TabsContent>
        <TabsContent className="flex flex-col gap-6 outline-none" id={SETTINGS_TAB.SECURITY}>
          <PasswordCard />
          <TwoFactorCard />
          <ConnectedAccountsCard />
          <SessionsCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const NAMESPACE = "pages.app.settings"

export const Route = createFileRoute("/app/settings")({
  validateSearch: settingsSearchSchema,
  component: SettingsPage,
  head: pageHead(ROUTES.APP_SETTINGS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const { queryClient } = context
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient }),
      queryClient.query({ ...getActiveSessionsQuery, staleTime: "static" }),
      queryClient.query({ ...listAccountsQuery, staleTime: "static" }),
      ...ACCOUNT_DELETION_NOTICES.map(({ load }) => load({ queryClient })),
    ])
    return { locale, metadata }
  },
  pendingComponent: AppSettingsPending,
  search: { middlewares: [onlyDeclaredSearch(settingsSearchSchema), stripSearchParams({ tab: SETTINGS_TAB.GENERAL })] },
  staticData: { namespaces: [NAMESPACE] },
})
