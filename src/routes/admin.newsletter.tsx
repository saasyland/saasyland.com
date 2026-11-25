import type { JSX } from "react"

import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router"
import { SquarePen } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { LinkButton } from "~/src/presentation/components/shadcn/button"
import { Tabs, TabsContent } from "~/src/presentation/components/shadcn/tabs"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminNewsletterPending } from "~/src/presentation/components/custom/admin/newsletter-pending"
import { NEWSLETTER_TABS, NewsletterTabs } from "~/src/presentation/components/custom/admin/newsletter/newsletter-tabs"

import * as ROUTES from "~/src/routes"

const AdminNewsletterLayout = (): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter")
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const selectedTab = NEWSLETTER_TABS.find((tab) => tab.to === pathname)?.to ?? ROUTES.ADMIN_NEWSLETTER

  return (
    <Tabs className="min-h-0 w-full flex-1 animate-in gap-0 duration-500 fade-in-50" selectedKey={selectedTab}>
      <AdminPageHeader
        actions={
          <LinkButton className="h-9 gap-2" size="sm" to={ROUTES.ADMIN_NEWSLETTER_COMPOSE}>
            <SquarePen aria-hidden className="size-4" />
            {t("newIssue")}
          </LinkButton>
        }
        description={t("description")}
        tabs={<NewsletterTabs />}
        title={t("title")}
      />

      <TabsContent className="flex min-h-0 flex-1 flex-col overflow-hidden pt-8" id={selectedTab}>
        <Outlet />
      </TabsContent>
    </Tabs>
  )
}

const NAMESPACES = ["pages.admin.newsletter"] as const

export const Route = createFileRoute("/admin/newsletter")({
  component: AdminNewsletterLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: AdminNewsletterPending,
  staticData: { namespaces: NAMESPACES },
})
