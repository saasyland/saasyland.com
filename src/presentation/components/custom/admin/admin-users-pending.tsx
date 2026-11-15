import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { USER_TABS, type UserTab } from "~/src/data/user-tabs"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { AdminUsersAllPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { TitlePending } from "~/src/presentation/components/custom/admin/pending-blocks"

import { ROUTES } from "~/src/routes"

const USER_PAGES = new Map<string, UserTab["pendingComponent"]>([
  [ROUTES.ADMIN_USERS, AdminUsersAllPending],
  ...USER_TABS.map(({ pendingComponent, to }): [string, UserTab["pendingComponent"]] => [to, pendingComponent]),
])

export const AdminUsersPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = USER_PAGES.get(pathname)

  return (
    <div className="-mx-4 -mt-5 -mb-6 flex min-h-0 w-[calc(100%+2rem)] flex-1 flex-col overflow-hidden md:-mx-6 md:-mt-7 md:-mb-8 md:w-[calc(100%+3rem)]">
      <div className="shrink-0 border-b border-border bg-muted/30 px-4 pt-5 md:px-6 md:pt-7">
        <div className="mb-6">
          <TitlePending />
          <div className="mt-0.5 flex flex-col text-body-sm">
            <Skeleton className="h-lh w-104 max-w-full scale-y-70" />
            <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <div className="border-b border-border">
            <div className="no-scrollbar flex h-8 w-fit max-w-full items-center justify-start gap-6 overflow-x-auto p-[3px]">
              {USER_TABS.map((tab) => (
                <Skeleton className="h-lh w-20 shrink-0 scale-y-70 text-sm" key={tab.key} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-5 md:px-6 md:pt-6">{Page && <Page />}</div>
    </div>
  )
}
