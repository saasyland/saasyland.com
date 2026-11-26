import type { JSX } from "react"

import { createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { settingsSearchSchema } from "~/src/integrations/better-auth/auth.zod"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { businessProfileQuery } from "~/src/modules/business-profile/use-cases/get-business-profile"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"

import { SETTINGS_TAB } from "~/src/data/auth"

import { onlyDeclaredSearch } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Tabs, TabsContent } from "~/src/presentation/components/shadcn/tabs"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminSettingsPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { BusinessLogoCard, BusinessProfileCard } from "~/src/presentation/components/custom/admin/business-profile-card"
import { PreferencesCard } from "~/src/presentation/components/custom/preferences-card"
import { EmailCard } from "~/src/presentation/components/custom/settings/email-card"
import { SecurityCards, SettingsTabs } from "~/src/presentation/components/custom/settings/settings-tabs"

import { ROUTES } from "~/src/routes"

const SettingsPage = (): JSX.Element => {
  const t = useTranslations()

  const { tab } = Route.useSearch()

  return (
    <Tabs className="w-full animate-in gap-0 duration-500 fade-in-50" selectedKey={tab}>
      <AdminPageHeader
        description={t("pages.admin.settings.description")}
        tabs={<SettingsTabs to={ROUTES.ADMIN.SETTINGS} />}
        title={t("pages.admin.settings.title")}
      />

      <TabsContent className="mt-8 grid grid-cols-1 items-start gap-6 outline-none lg:grid-cols-2" id={SETTINGS_TAB.GENERAL}>
        <BusinessProfileCard />
        <BusinessLogoCard />
        <PreferencesCard />
        <EmailCard />
      </TabsContent>

      <TabsContent className="mt-8 flex flex-col gap-6 outline-none" id={SETTINGS_TAB.SECURITY}>
        <SecurityCards />
      </TabsContent>
    </Tabs>
  )
}

const NAMESPACE = "pages.admin.settings"

export const Route = createFileRoute("/admin/settings")({
  validateSearch: settingsSearchSchema,
  component: SettingsPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...businessProfileQuery, staleTime: "static" }),
      context.queryClient.query({ ...getActiveSessionsQuery, staleTime: "static" }),
      context.queryClient.query({ ...listAccountsQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.ADMIN.SETTINGS),
  pendingComponent: AdminSettingsPending,
  search: { middlewares: [onlyDeclaredSearch(settingsSearchSchema), stripSearchParams({ tab: SETTINGS_TAB.GENERAL })] },
  staticData: { namespaces: [NAMESPACE] },
})
