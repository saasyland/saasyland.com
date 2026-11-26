import type { JSX } from "react"

import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { Tabs, TabsContent } from "~/src/presentation/components/shadcn/tabs"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"
import { USER_TABS, UserTabs } from "~/src/presentation/components/custom/admin/users/user-tabs"

import { ROUTES } from "~/src/routes"

const AdminUsersLayout = (): JSX.Element => {
  const t = useTranslations()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const selectedTab = USER_TABS.find((tab) => tab.to === pathname)?.to ?? ROUTES.ADMIN.USERS.ALL

  return (
    <Tabs className="min-h-0 w-full flex-1 animate-in gap-0 duration-500 fade-in-50" selectedKey={selectedTab}>
      <AdminPageHeader description={t("pages.admin.users.description")} tabs={<UserTabs />} title={t("pages.admin.users.title")} />

      <TabsContent className="flex min-h-0 flex-1 flex-col overflow-hidden pt-8" id={selectedTab}>
        <Outlet />
      </TabsContent>
    </Tabs>
  )
}

const NAMESPACES = ["pages.admin.customers", "pages.admin.orders", "pages.admin.users", "pages.admin.users.license"] as const

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: AdminUsersPending,
  staticData: { namespaces: NAMESPACES },
})
