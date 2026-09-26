import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"

import { ADMIN_SETTINGS_TABS } from "~/src/data/admin"

import { pageHead } from "~/src/lib/seo"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { AdminSettingsPending } from "~/src/presentation/components/custom/admin/administration-pending"
import { DangerZoneCard } from "~/src/presentation/components/custom/admin/settings/danger-zone-card"
import { SettingsPasswordForm } from "~/src/presentation/components/custom/admin/settings/password-form"
import { PreferencesCard } from "~/src/presentation/components/custom/admin/settings/preferences-card"
import { ProfileCard } from "~/src/presentation/components/custom/admin/settings/profile-card"
import { SettingsSessions } from "~/src/presentation/components/custom/admin/settings/sessions"
import { SettingsTwoFactor } from "~/src/presentation/components/custom/admin/settings/two-factor"

import { ROUTES } from "~/src/routes"

const SettingsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs defaultSelectedKey="general" className="w-full">
        <div className="border-b border-border">
          <TabsList variant="line" className="no-scrollbar w-full justify-start gap-6 overflow-x-auto">
            {ADMIN_SETTINGS_TABS.map((tab) => (
              <TabsTrigger className="flex-none px-0 text-sm" id={tab} key={tab}>
                {t(`tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent id="general" className="mt-8 space-y-6 outline-none">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProfileCard />
            <PreferencesCard />
          </div>
          <DangerZoneCard />
        </TabsContent>

        <TabsContent id="security" className="mt-8 space-y-6 outline-none">
          <SettingsPasswordForm />
          <SettingsTwoFactor />
          <SettingsSessions />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const NAMESPACE = "pages.admin.settings"

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
  head: pageHead(ROUTES.ADMIN_SETTINGS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getActiveSessionsQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminSettingsPending,
  staticData: { namespaces: [NAMESPACE] },
})
