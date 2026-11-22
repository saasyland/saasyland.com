import type { JSX } from "react"

import { createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"

import { SETTINGS_TAB, SETTINGS_TABS, settingsSearchSchema } from "~/src/data/auth"

import { onlyDeclaredSearch } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { AdminSettingsPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { PreferencesCard } from "~/src/presentation/components/custom/preferences-card"
import { ConnectedAccountsCard } from "~/src/presentation/components/custom/settings/connected-accounts-card"
import { EmailCard } from "~/src/presentation/components/custom/settings/email-card"
import { PasswordCard } from "~/src/presentation/components/custom/settings/password-card"
import { SessionsCard } from "~/src/presentation/components/custom/settings/sessions-card"
import { TwoFactorCard } from "~/src/presentation/components/custom/settings/two-factor-card"

import { ROUTES } from "~/src/routes"

const SettingsPage = (): JSX.Element => {
  const t = useTranslations()

  const { tab } = Route.useSearch()

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("pages.admin.settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("pages.admin.settings.description")}</p>
      </div>

      <Tabs className="w-full" selectedKey={tab}>
        <div className="border-b border-border">
          <TabsList className="no-scrollbar w-full justify-start gap-6 overflow-x-auto" variant="line">
            {SETTINGS_TABS.map((id) => (
              <TabsTrigger className="flex-none px-0 text-sm" href={`${ROUTES.ADMIN_SETTINGS}?tab=${id}`} id={id} key={id}>
                {t(`auth.security.tabs.${id}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent className="mt-8 grid grid-cols-1 items-start gap-6 outline-none lg:grid-cols-2" id={SETTINGS_TAB.GENERAL}>
          <PreferencesCard />
          <EmailCard />
        </TabsContent>

        <TabsContent className="mt-8 flex flex-col gap-6 outline-none" id={SETTINGS_TAB.SECURITY}>
          <PasswordCard />
          <TwoFactorCard />
          <ConnectedAccountsCard />
          <SessionsCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const NAMESPACE = "pages.admin.settings"

export const Route = createFileRoute("/admin/settings")({
  validateSearch: settingsSearchSchema,
  component: SettingsPage,
  head: pageHead(ROUTES.ADMIN_SETTINGS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getActiveSessionsQuery, staleTime: "static" }),
      context.queryClient.query({ ...listAccountsQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminSettingsPending,
  search: { middlewares: [onlyDeclaredSearch(settingsSearchSchema), stripSearchParams({ tab: SETTINGS_TAB.GENERAL })] },
  staticData: { namespaces: [NAMESPACE] },
})
