import type { JSX } from "react"

import { Link, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { ADMIN_NAVIGATION } from "~/src/data/navigation"

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

      <SidebarContent className="custom-scrollbar px-2 pt-4">
        <nav aria-label={t("navigationLabel")} className="flex flex-col gap-5">
          {ADMIN_NAVIGATION.map((group) => (
            <SidebarGroup className="p-0" key={group.key}>
              <div className="mb-1.5 px-2 font-mono text-label text-muted-foreground uppercase" id={`admin-sidebar-${group.key}`}>
                {t(`groups.${group.key}`)}
              </div>
              <SidebarMenu aria-labelledby={`admin-sidebar-${group.key}`} className="gap-0.5">
                {group.items.map((item) => {
                  const isActive = isActiveUrl(pathname, item.to)

                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        {...(isActive && { "aria-current": "page" })}
                        className="h-8 gap-2.5 rounded-md px-2 text-[0.8125rem] transition-colors duration-200 ease-exp data-active:font-medium"
                        href={item.to}
                        isActive={isActive}
                      >
                        <item.icon
                          aria-hidden
                          className={cn("size-4 transition-colors duration-200 ease-exp", {
                            "text-muted-foreground": !isActive,
                            "text-ring": isActive,
                          })}
                          strokeWidth={1.5}
                        />
                        <span className={cn({ "text-foreground": isActive, "text-sidebar-foreground/80": !isActive })}>
                          {t(`links.${item.key}`)}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <UserWidget />
      </SidebarFooter>
    </Sidebar>
  )
}
