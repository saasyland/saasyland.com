import type { JSX } from "react"

import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AUTH_USER_TABS } from "~/src/data/auth.user-tabs"
import { layoutNamespaces } from "~/src/data/namespaces"
import { USER_TABS } from "~/src/data/user-tabs"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"

const AdminUsersLayout = (): JSX.Element => {
  const t = useTranslations()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeTab = USER_TABS.find((tab) => pathname === tab.to) ?? AUTH_USER_TABS[0]

  return (
    <Tabs
      className="-mx-4 -mt-5 -mb-6 min-h-0 w-[calc(100%+2rem)] flex-1 gap-0 overflow-hidden md:-mx-6 md:-mt-7 md:-mb-8 md:w-[calc(100%+3rem)]"
      selectedKey={activeTab.key}
    >
      <div className="shrink-0 border-b border-border bg-muted/30 px-4 pt-5 md:px-6 md:pt-7">
        <div className="mb-6">
          <h1 className="text-statement font-semibold text-foreground">{t("pages.admin.users.title")}</h1>
          <p className="mt-0.5 text-body-sm text-muted-foreground">{t("pages.admin.users.description")}</p>
        </div>
        <div className="border-b border-border">
          <TabsList variant="line" className="no-scrollbar flex-1 justify-start gap-6 overflow-x-auto">
            {USER_TABS.map((tab) => (
              <TabsTrigger key={tab.key} id={tab.key} href={tab.to} className="flex-none px-0 text-sm">
                {t(`navigation.${tab.area}.userTabs.${tab.key}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      <TabsContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-5 md:px-6 md:pt-6" id={activeTab.key}>
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
