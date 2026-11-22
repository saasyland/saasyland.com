import type { JSX } from "react"

import { Link, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { useNavigationLabel } from "~/src/hooks/use-navigation-label"

import { ADMIN_NAVIGATION } from "~/src/data/navigation"

import { cn } from "~/src/lib/cn"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuLink,
} from "~/src/presentation/components/shadcn/sidebar"

import { UserWidget } from "~/src/presentation/components/custom/admin/user-widget"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { APP_NAME } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const isActiveUrl = (pathname: string, url: string): boolean => {
  if (url === ROUTES.ADMIN) {
    return pathname === ROUTES.ADMIN
  }

  return pathname === url || pathname.startsWith(`${url}/`)
}

export const AdminSidebar = (): JSX.Element => {
  const t = useTranslations("pages.admin.sidebar")
  const navigationLabel = useNavigationLabel()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:px-2">
        <Link
          aria-label={APP_NAME}
          className="flex h-9 items-center rounded-md px-2 transition-colors duration-200 ease-exp group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          to={ROUTES.HOME}
        >
          <Wordmark aria-hidden className="group-data-[collapsible=icon]:[&>span]:hidden" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar px-2 pt-3">
        <nav aria-label={t("navigationLabel")} className="flex flex-col gap-3">
          {ADMIN_NAVIGATION.map((group) => (
            <SidebarGroup className="p-0" key={group.key}>
              <SidebarGroupLabel className="h-7 px-2 text-label text-muted-foreground uppercase" id={`admin-sidebar-${group.key}`}>
                {t(`groups.${group.key}`)}
              </SidebarGroupLabel>
              <SidebarMenu aria-labelledby={`admin-sidebar-${group.key}`} className="gap-0.5" role="group">
                {group.items.map((item) => {
                  const isActive = isActiveUrl(pathname, item.to)
                  const label = navigationLabel(item)

                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuLink
                        activeOptions={{ exact: item.to === ROUTES.ADMIN }}
                        className="relative h-8 gap-2.5 rounded-md px-2 text-body-sm transition-colors duration-200 ease-exp before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-transparent group-data-[collapsible=icon]:before:hidden data-active:font-medium data-active:before:bg-ring"
                        to={item.to}
                        isActive={isActive}
                        tooltip={label}
                      >
                        <item.icon
                          aria-hidden
                          className={cn("size-4 transition-colors duration-200 ease-exp", {
                            "text-muted-foreground": !isActive,
                            "text-ring": isActive,
                          })}
                          strokeWidth={1.5}
                        />
                        <span className={cn({ "text-foreground": isActive, "text-sidebar-foreground/80": !isActive })}>{label}</span>
                      </SidebarMenuLink>
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
