import type { JSX } from "react"

import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { ADMIN_USERS_TABS } from "~/src/data/admin"

import { Tabs, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { AdminUsersPending } from "~/src/presentation/components/custom/admin/administration-pending"

const AdminUsersLayout = (): JSX.Element => {
  const t = useTranslations("pages.admin.users")
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeTab = ADMIN_USERS_TABS.find((tab) => pathname === tab.href) ?? ADMIN_USERS_TABS[0]

  return (
    <div className="-mx-4 -mt-5 -mb-6 flex min-h-0 w-[calc(100%+2rem)] flex-1 flex-col overflow-hidden md:-mx-6 md:-mt-7 md:-mb-8 md:w-[calc(100%+3rem)]">
      <div className="shrink-0 border-b border-border bg-muted/30 px-4 pt-5 md:px-6 md:pt-7">
        <div className="mb-6">
          <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-0.5 text-body-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Tabs selectedKey={activeTab.id} className="w-full">
          <div className="border-b border-border">
            <TabsList variant="line" className="no-scrollbar flex-1 justify-start gap-6 overflow-x-auto">
              {ADMIN_USERS_TABS.map((tab) => (
                <TabsTrigger key={tab.id} id={tab.id} href={tab.href} className="flex-none px-0 text-sm">
                  {t(`tabs.${tab.id}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-5 md:px-6 md:pt-6">
        <Outlet />
      </div>
    </div>
  )
}

const NAMESPACES = ["pages.admin.users"] as const

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: AdminUsersPending,
  staticData: { namespaces: NAMESPACES },
})
