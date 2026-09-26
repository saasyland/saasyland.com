import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { APP_LICENSE_TIERS, APP_NAVIGATION } from "~/src/data/app"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { Background } from "~/src/presentation/components/custom/background"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { ROUTES } from "~/src/routes"

const CheckoutOptionsPending = (): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-32 scale-y-70 text-base leading-snug" />
      <div className="flex flex-col text-sm">
        <Skeleton className="h-lh w-full scale-y-70 sm:w-3/4" />
        <Skeleton className="h-lh w-full scale-y-70 sm:hidden" />
        <Skeleton className="h-lh w-1/2 scale-y-70 sm:hidden" />
      </div>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {APP_LICENSE_TIERS.map((tier) => (
          <Skeleton className="h-8 w-22 rounded-lg" key={tier} />
        ))}
      </div>
      <div className="flex flex-col text-xs leading-relaxed">
        <Skeleton className="h-lh w-full scale-y-70 lg:w-4/5" />
        <Skeleton className="h-lh w-full scale-y-70 lg:hidden" />
        <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
      </div>
    </CardContent>
  </Card>
)

const DocsStepPending = (): JSX.Element => (
  <div className="flex flex-col items-start gap-3">
    <div className="w-full space-y-1 text-sm">
      <Skeleton className="h-lh w-24 scale-y-70" />
      <div className="flex flex-col">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-1/4 scale-y-70 sm:hidden" />
      </div>
    </div>
    <Skeleton className="h-7 w-42 rounded-lg" />
  </div>
)

const SupportStepPending = (): JSX.Element => (
  <div className="flex flex-col items-start gap-3">
    <div className="w-full space-y-1 text-sm">
      <Skeleton className="h-lh w-24 scale-y-70" />
      <Skeleton className="h-lh w-4/5 scale-y-70" />
    </div>
    <Skeleton className="h-7 w-30 rounded-lg" />
  </div>
)

export const AppOverviewPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col gap-8 pb-8">
    <div className="flex flex-col gap-1">
      <Skeleton className="h-lh w-32 scale-y-70 text-statement" />
      <Skeleton className="h-lh w-80 max-w-full scale-y-70 text-sm" />
    </div>
    <CheckoutOptionsPending />
    <div className="grid gap-8 sm:grid-cols-2">
      <DocsStepPending />
      <SupportStepPending />
    </div>
  </div>
)

export const AppLicensePending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col gap-8 pb-8">
    <div className="flex flex-col gap-1">
      <Skeleton className="h-lh w-32 scale-y-70 text-statement" />
      <div className="flex flex-col text-sm">
        <Skeleton className="h-lh w-80 max-w-full scale-y-70" />
        <Skeleton className="h-lh w-1/4 scale-y-70 sm:hidden" />
      </div>
    </div>
    <CheckoutOptionsPending />
    <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
  </div>
)

const APP_PAGES = new Map<string, () => JSX.Element>([
  [ROUTES.APP, AppOverviewPending],
  [ROUTES.APP_LICENSE, AppLicensePending],
])

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
          <SidebarLinkPending key={item.url} />
        ))}
      </div>
      <div className="flex flex-col">
        <div className="mb-1.5 px-2 font-mono text-label">
          <Skeleton className="h-lh w-18 scale-y-70" />
        </div>
        <div className="flex flex-col gap-1">
          <SidebarLinkPending />
          <SidebarLinkPending />
        </div>
      </div>
    </div>
    <div className="flex flex-col gap-3 border-t border-sidebar-border p-3">
      <div className="flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input py-2 pr-2 pl-2.5 text-body-sm">
        <Skeleton className="h-lh w-16 scale-y-70" />
        <Skeleton className="size-4 shrink-0" />
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <Skeleton className="size-8 shrink-0 rounded-md" />
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
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = APP_PAGES.get(pathname)

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
        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 pb-6 md:px-6 md:pt-7 md:pb-8">
          <div className="mx-auto w-full max-w-5xl">{Page && <Page />}</div>
        </div>
      </div>
    </div>
  )
}
