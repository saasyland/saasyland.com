import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { USER_TABS, type UserTab } from "~/src/data/user-tabs"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminUserProfilePending, AdminUsersAllPending } from "~/src/presentation/components/custom/admin/auth-pending"

import { ROUTES } from "~/src/routes"

const USER_PAGES = new Map<string, UserTab["pendingComponent"]>([
  [ROUTES.ADMIN_USERS, AdminUsersAllPending],
  ...USER_TABS.map(({ pendingComponent, to }): [string, UserTab["pendingComponent"]] => [to, pendingComponent]),
])

export const AdminUsersPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = USER_PAGES.get(pathname) ?? AdminUserProfilePending

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <AdminPageHeaderPending tabs={USER_TABS.length} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-8">
        <Page />
      </div>
    </div>
  )
}
