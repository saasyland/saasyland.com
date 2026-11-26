import type { JSX } from "react"

import { createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { settingsSearchSchema } from "~/src/integrations/better-auth/auth.zod"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { getNewsletterSubscriptionQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscription"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"

import { SETTINGS_TAB } from "~/src/data/auth"

import { onlyDeclaredSearch } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Tabs, TabsContent } from "~/src/presentation/components/shadcn/tabs"

import { AppSettingsPending } from "~/src/presentation/components/custom/app/auth-pending"
import { NewsletterCard } from "~/src/presentation/components/custom/newsletter-card"
import { PreferencesCard } from "~/src/presentation/components/custom/preferences-card"
import { ACCOUNT_DELETION_NOTICES, DeleteAccountCard } from "~/src/presentation/components/custom/settings/delete-account-card"
import { EmailCard } from "~/src/presentation/components/custom/settings/email-card"
import { SecurityCards, SettingsTabs } from "~/src/presentation/components/custom/settings/settings-tabs"

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
          <SettingsTabs to={ROUTES.APP.SETTINGS.INDEX} />
        </div>
        <TabsContent className="flex flex-col gap-6 outline-none" id={SETTINGS_TAB.GENERAL}>
          <PreferencesCard />
          <NewsletterCard />
          <EmailCard />
          <DeleteAccountCard />
        </TabsContent>
        <TabsContent className="flex flex-col gap-6 outline-none" id={SETTINGS_TAB.SECURITY}>
          <SecurityCards />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const NAMESPACE = "pages.app.settings"

export const Route = createFileRoute("/app/settings")({
  validateSearch: settingsSearchSchema,
  component: SettingsPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getActiveSessionsQuery, staleTime: "static" }),
      context.queryClient.query({ ...listAccountsQuery, staleTime: "static" }),
      context.queryClient.query({ ...getNewsletterSubscriptionQuery, staleTime: "static" }),
      ...ACCOUNT_DELETION_NOTICES.map(({ load }) => load({ queryClient: context.queryClient })),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.APP.SETTINGS.INDEX),
  pendingComponent: AppSettingsPending,
  search: { middlewares: [onlyDeclaredSearch(settingsSearchSchema), stripSearchParams({ tab: SETTINGS_TAB.GENERAL })] },
  staticData: { namespaces: [NAMESPACE] },
})
