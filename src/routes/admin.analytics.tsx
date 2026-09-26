import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Calendar, ChevronDown } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { ADMIN_ANALYTICS_TABS } from "~/src/data/admin"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { AnalyticsKpis } from "~/src/presentation/components/custom/admin/analytics/kpis"
import { RegionsAndUpgrades } from "~/src/presentation/components/custom/admin/analytics/regions-and-upgrades"
import { AnalyticsRevenueChart } from "~/src/presentation/components/custom/admin/analytics/revenue-chart"
import { AdminAnalyticsPending } from "~/src/presentation/components/custom/admin/overview-pending"

import { ROUTES } from "~/src/routes"

const AnalyticsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.analytics")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs defaultSelectedKey="overview" className="w-full">
        <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line" className="no-scrollbar flex-1 justify-start gap-6 overflow-x-auto">
            {ADMIN_ANALYTICS_TABS.map((tab) => (
              <TabsTrigger className="flex-none px-0 text-sm" id={tab} key={tab}>
                {t(`tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex flex-wrap items-center gap-3 pb-3 sm:pb-0">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              {t("actions.datePicker")}
              <ChevronDown className="ml-1 size-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <TabsContent id="overview" className="mt-8 space-y-6 outline-none">
          <AnalyticsKpis />

          <AnalyticsRevenueChart />

          <RegionsAndUpgrades />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const NAMESPACE = "pages.admin.analytics"

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
  head: pageHead(ROUTES.ADMIN_ANALYTICS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminAnalyticsPending,
  staticData: { namespaces: [NAMESPACE] },
})
