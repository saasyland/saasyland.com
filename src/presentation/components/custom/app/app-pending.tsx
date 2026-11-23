import type { JSX } from "react"

import { usePagePending } from "~/src/hooks/use-page-pending"

import { APP_NAVIGATION, APP_RESOURCE_NAVIGATION } from "~/src/data/navigation"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { Background } from "~/src/presentation/components/custom/background"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

const SidebarLinkPending = (): JSX.Element => (
  <div className="flex h-9 items-center gap-2.5 px-2 text-body-sm">
    <Skeleton className="size-4 shrink-0" />
    <Skeleton className="h-lh w-24 scale-y-70" />
  </div>
)

const AppSidebarPending = (): JSX.Element => (
  <div className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
    <div className="flex h-14 shrink-0 flex-col justify-center border-b border-sidebar-border px-3">
      <div className="flex h-9 items-center px-2">
        <Wordmark />
      </div>
    </div>
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-2 pt-4">
      <div className="flex flex-col gap-1">
        {APP_NAVIGATION.map((item) => (
          <SidebarLinkPending key={item.to} />
        ))}
      </div>
      <div className="flex flex-col">
        <div className="mb-1.5 px-2 text-label">
          <Skeleton className="h-lh w-18 scale-y-70" />
        </div>
        <div className="flex flex-col gap-1">
          {APP_RESOURCE_NAVIGATION.map((item) => (
            <SidebarLinkPending key={item.to} />
          ))}
          <SidebarLinkPending />
        </div>
      </div>
    </div>
    <div className="flex flex-col gap-3 border-t border-sidebar-border p-3">
      <div className="flex h-9 w-full items-center justify-between gap-1.5 rounded-md border border-input py-2 pr-2 pl-2.5 text-body-sm">
        <Skeleton className="h-lh w-16 scale-y-70" />
        <Skeleton className="size-4 shrink-0" />
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Skeleton className="h-lh w-24 scale-y-70 text-body-sm" />
          <Skeleton className="h-lh w-36 max-w-full scale-y-70 text-label" />
        </div>
        <div className="flex size-7 shrink-0 items-center justify-center">
          <Skeleton className="size-4" />
        </div>
      </div>
    </div>
  </div>
)

export const AppPending = (): JSX.Element => {
  const Page = usePagePending("/app")

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <AppSidebarPending />
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <Background className="z-[-1]" glow={false} />
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-xl md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="-ml-1 flex size-7 shrink-0 items-center justify-center">
              <Skeleton className="size-4" />
            </div>
            <span aria-hidden className="h-4 w-px bg-border" />
            <Skeleton className="h-lh w-16 scale-y-70 text-body-sm" />
          </div>
          <div className="flex shrink-0 items-center gap-1 text-body-sm">
            <Skeleton className="h-lh w-26 scale-y-70" />
            <Skeleton className="size-4" />
          </div>
        </div>
        <div
          className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 pb-6 md:px-6 md:pt-7 md:pb-8"
          data-page-scroller
        >
          <div className="mx-auto w-full max-w-5xl">{Page && <Page />}</div>
        </div>
      </div>
    </div>
  )
}
