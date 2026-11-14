import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { AppSettingsPending } from "~/src/presentation/components/custom/app/app-pending"
import { PreferencesCard } from "~/src/presentation/components/custom/preferences-card"

import { ROUTES } from "~/src/routes"

const SettingsPage = (): JSX.Element => {
  const t = useTranslations("pages.app.settings")

  return (
    <div className="flex w-full flex-col gap-8 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
      </header>
      <PreferencesCard />
    </div>
  )
}

const NAMESPACE = "pages.app.settings"

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
  head: pageHead(ROUTES.APP_SETTINGS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AppSettingsPending,
  staticData: { namespaces: [NAMESPACE] },
})
