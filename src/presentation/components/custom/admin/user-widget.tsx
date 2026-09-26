import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { ChevronsUpDown, Settings } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { getUserInitials } from "~/src/modules/user/user.utils"

import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "~/src/presentation/components/shadcn/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "~/src/presentation/components/shadcn/sidebar"

import { SignOutButton } from "~/src/presentation/components/custom/admin/sign-out-button"

import { ROUTES } from "~/src/routes"

export const UserWidget = (): JSX.Element | undefined => {
  const session = useSuspenseQuery(getCurrentSessionQuery).data
  const router = useRouter()
  const t = useTranslations("pages.admin.components.userWidget")

  if (session === null) {
    return undefined
  }

  const { email } = session.user
  const name = session.user.name || email

  const handleOpenSettings = () => {
    void router.navigate({ to: ROUTES.ADMIN_SETTINGS })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenuTrigger>
          <SidebarMenuButton
            className="h-11 gap-2.5 rounded-lg px-2 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
            size="lg"
          >
            <span
              aria-hidden
              className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[0.6875rem] font-semibold text-foreground"
            >
              {getUserInitials(name)}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 text-left leading-none">
              <span className="truncate text-[0.8125rem] font-medium text-foreground">{name}</span>
              <span className="truncate text-[0.6875rem] text-muted-foreground">{email}</span>
            </span>
            <ChevronsUpDown aria-hidden className="ml-auto size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          </SidebarMenuButton>
          <DropdownMenu className="min-w-56" offset={4} placement="top start">
            <DropdownMenuItem onAction={handleOpenSettings}>
              <Settings className="size-4" />
              {t("settings")}
            </DropdownMenuItem>
            <SignOutButton />
          </DropdownMenu>
        </DropdownMenuTrigger>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
