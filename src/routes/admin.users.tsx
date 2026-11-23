import type { JSX } from "react"

import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AUTH_BROWSER } from "~/src/areas/auth"
import { BROWSER_AREAS, layoutNamespaces } from "~/src/areas/browser"

import { Tabs, TabsContent, TabsLink, TabsList } from "~/src/presentation/components/shadcn/tabs"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"

const USER_TABS = BROWSER_AREAS.flatMap(({ name, userTabs = [] }) => userTabs.map((tab) => ({ ...tab, area: name }))).toSorted(
  (first, second) => first.order - second.order,
)

const [ALL_USERS_TAB] = AUTH_BROWSER.userTabs

const AdminUsersLayout = (): JSX.Element => {
  const t = useTranslations()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeTab = USER_TABS.find((tab) => pathname === tab.to) ?? ALL_USERS_TAB

  return (
    <Tabs className="min-h-0 w-full flex-1 animate-in gap-0 duration-500 fade-in-50" selectedKey={activeTab.key}>
      <AdminPageHeader
        description={t("pages.admin.users.description")}
        tabs={
          <TabsList className="no-scrollbar justify-start gap-6 overflow-x-auto" variant="line">
            {USER_TABS.map((tab) => (
              <TabsLink className="flex-none px-0 text-sm" href={tab.to} id={tab.key} key={tab.key}>
                {t(`navigation.${tab.area}.userTabs.${tab.key}`)}
              </TabsLink>
            ))}
          </TabsList>
        }
        title={t("pages.admin.users.title")}
      />

      <TabsContent className="flex min-h-0 flex-1 flex-col overflow-hidden pt-8" id={activeTab.key}>
        <Outlet />
      </TabsContent>
    </Tabs>
  )
}

const NAMESPACES = ["pages.admin.users", ...layoutNamespaces("/admin/users")] as const

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: AdminUsersPending,
  staticData: { namespaces: NAMESPACES },
})
