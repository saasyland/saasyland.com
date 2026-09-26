import type { JSX } from "react"

import { Link, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { ADMIN_SIDEBAR_GROUPS } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/src/presentation/components/shadcn/sidebar"

import { UserWidget } from "~/src/presentation/components/custom/admin/user-widget"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { ROUTES } from "~/src/routes"

const isActiveUrl = (pathname: string, url: string): boolean => {
  if (url === ROUTES.ADMIN) {
    return pathname === ROUTES.ADMIN
  }

  return pathname === url || pathname.startsWith(`${url}/`)
}

export const AdminSidebar = (): JSX.Element => {
  const t = useTranslations("pages.admin.sidebar")
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <Sidebar>
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3 py-0">
        <Link
          className="flex h-9 items-center rounded-md px-2 transition-colors duration-200 ease-exp hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          to={ROUTES.ADMIN}
        >
          <Wordmark />
        </Link>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar gap-5 px-2 pt-4">
        {ADMIN_SIDEBAR_GROUPS.map((group) => (
          <SidebarGroup className="p-0" key={group.titleKey}>
            <div className="mb-1.5 px-2 font-mono text-label text-muted-foreground uppercase">{t(`groups.${group.titleKey}`)}</div>
            <SidebarMenu className="gap-0.5">
              {group.items.map((item) => {
                const isActive = isActiveUrl(pathname, item.url)

                return (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton
                      className="h-8 gap-2.5 rounded-md px-2 text-[0.8125rem] transition-colors duration-200 ease-exp data-active:font-medium"
                      href={item.url}
                      isActive={isActive}
                    >
                      <item.icon
                        className={cn("size-4 transition-colors duration-200 ease-exp", {
                          "text-muted-foreground": !isActive,
                          "text-ring": isActive,
                        })}
                        strokeWidth={1.5}
                      />
                      <span className={cn({ "text-foreground": isActive, "text-sidebar-foreground/80": !isActive })}>
                        {t(`links.${item.titleKey}`)}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <UserWidget />
      </SidebarFooter>
    </Sidebar>
  )
}
