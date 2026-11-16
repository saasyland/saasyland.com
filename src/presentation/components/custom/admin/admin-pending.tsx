import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { ADMIN_NAVIGATION } from "~/src/data/navigation"
import { PAGE_SKELETONS } from "~/src/data/skeletons"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { IconPending } from "~/src/presentation/components/custom/admin/pending-blocks"
import { Background } from "~/src/presentation/components/custom/background"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { ROUTES } from "~/src/routes"

const ADMIN_SIDEBAR_URLS = new Set<string>(ADMIN_NAVIGATION.flatMap((group) => group.items.map((item) => item.to)))

const AdminSidebarPending = (): JSX.Element => (
  <div className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
    <div className="flex h-14 shrink-0 flex-col justify-center border-b border-sidebar-border px-3">
      <div className="flex h-9 items-center px-2">
        <Wordmark />
      </div>
    </div>
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-2 pt-4">
      {ADMIN_NAVIGATION.map((group) => (
        <div className="flex flex-col" key={group.key}>
          <div className="mb-1.5 px-2 font-mono text-label">
            <Skeleton className="h-lh w-20 scale-y-70" />
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <div className="flex h-8 items-center gap-2.5 px-2 text-[0.8125rem]" key={item.to}>
                <IconPending />
                <Skeleton className="h-lh w-24 scale-y-70" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="flex flex-col border-t border-sidebar-border p-2">
      <div className="flex h-11 items-center gap-2.5 px-2">
        <Skeleton className="size-7 shrink-0 rounded-md" />
        <div className="flex min-w-0 flex-col gap-0.5 leading-none">
          <Skeleton className="h-lh w-20 scale-y-70 text-[0.8125rem]" />
          <Skeleton className="h-lh w-40 scale-y-70 text-[0.6875rem]" />
        </div>
        <Skeleton className="ml-auto size-4 shrink-0" />
      </div>
    </div>
  </div>
)

const BreadcrumbDivider = (): JSX.Element => (
  <span aria-hidden className="text-muted-foreground/40 select-none">
    /
  </span>
)

export const AdminPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = PAGE_SKELETONS.get(pathname)
  const [, section, action] = pathname.split("/").filter(Boolean)
  const hasSection = ADMIN_SIDEBAR_URLS.has(section === undefined ? ROUTES.ADMIN : `${ROUTES.ADMIN}/${section}`)

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <AdminSidebarPending />
      <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
        <Background className="z-[-1]" glow={false} />
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-xl md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="-ml-1 flex size-7 shrink-0 items-center justify-center">
              <IconPending />
            </div>
            <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
            <div className="hidden min-w-0 items-center gap-1.5 text-body-sm sm:flex">
              <Skeleton className="h-lh w-10 scale-y-70" />
              {hasSection && (
                <>
                  <BreadcrumbDivider />
                  <Skeleton className="h-lh w-20 scale-y-70" />
                </>
              )}
              {hasSection && action !== undefined && (
                <>
                  <BreadcrumbDivider />
                  <Skeleton className="h-lh w-16 scale-y-70" />
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg sm:w-60" />
          </div>
        </div>
        <div
          className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 pb-6 md:px-6 md:pt-7 md:pb-8"
          data-page-scroller
        >
          {Page && <Page />}
        </div>
      </div>
    </div>
  )
}
