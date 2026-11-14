import type { JSX } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { APP_NAVIGATION, appSearchSchema } from "~/src/data/app"
import { TIERS } from "~/src/data/marketing"

import { cn } from "~/src/lib/cn"

import { Card, CardAction, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { Background } from "~/src/presentation/components/custom/background"
import { PreferencesCardPending } from "~/src/presentation/components/custom/preferences-card"
import { FEATURED_TIER, FEATURE_IDS } from "~/src/presentation/components/custom/pricing"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { ROUTES } from "~/src/routes"

const usePendingLicenseView = () => {
  const queryClient = useQueryClient()
  const search = useRouterState({ select: ({ location }) => appSearchSchema.parse(location.search) })

  const license = queryClient.getQueryData(currentLicenseQuery.queryKey)?.license
  const catalogue = queryClient.getQueryData(catalogueQuery({ locale: getCurrentLocale() }).queryKey) ?? []
  const hasActiveLicense = license?.status === LICENSE_STATUS.ACTIVE
  const isBuying = search.checkoutId === undefined && !hasActiveLicense

  return {
    hasActivations: typeof license?.polarLicenseKeyId === "string",
    isAwaitingPayment: search.checkoutId !== undefined,
    isBuying,
    lockedCourses: catalogue.filter(({ paid }) => paid > 0).length,
    showsChosenTier: isBuying && search.tier !== undefined,
    showsLicense: license !== undefined && (hasActiveLicense || search.checkoutId === undefined),
  }
}

const TextLines = ({ className }: Readonly<{ className: string }>): JSX.Element => (
  <div className={cn("flex w-full flex-col", className)}>
    <Skeleton className="h-lh w-full max-w-[60ch] scale-y-70" />
    <Skeleton className="h-lh w-2/3 scale-y-70 sm:hidden" />
  </div>
)

const ActivationPending = (): JSX.Element => (
  <div className="flex items-start gap-5 rounded-xl border border-border bg-card p-6 md:p-8">
    <Skeleton className="size-11 shrink-0 rounded-full" />
    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
      <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-title" />
      <TextLines className="text-body-sm" />
    </div>
  </div>
)

const AgreementPending = (): JSX.Element => (
  <div className="flex w-full flex-col text-xs leading-relaxed">
    <Skeleton className="h-lh w-full scale-y-70 lg:w-4/5" />
    <Skeleton className="h-lh w-1/2 scale-y-70 lg:hidden" />
  </div>
)

const ChosenTierPending = (): JSX.Element => (
  <div className="overflow-hidden rounded-xl border border-ring/40 bg-card">
    <div className="grid gap-x-10 gap-y-7 p-6 md:p-8 lg:grid-cols-[1fr_18rem] lg:items-end">
      <div>
        <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-title" />
        <TextLines className="mt-2 text-body-sm" />
        <div className="mt-6 flex items-baseline gap-2">
          <Skeleton className="h-lh w-24 scale-y-70 text-price" />
          <Skeleton className="h-lh w-16 scale-y-70 text-spec" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full rounded-lg" />
        <AgreementPending />
      </div>
    </div>
  </div>
)

const TierColumnPending = ({ featured }: Readonly<{ featured: boolean }>): JSX.Element => (
  <div
    className={cn("flex flex-col border-border not-last:border-b @2xl:not-last:border-r @2xl:not-last:border-b-0", {
      "bg-background": !featured,
      "bg-card": featured,
    })}
  >
    <div className={cn("flex h-10 items-center border-b border-border px-7 @2xl:px-8", { "border-t-2 border-t-ring": featured })}>
      {featured && <Skeleton className="h-lh w-24 scale-y-70 text-spec" />}
    </div>
    <div className="flex flex-1 flex-col p-7 @2xl:p-8">
      <Skeleton className="h-lh w-20 scale-y-70 text-title" />
      <TextLines className="mt-1.5 text-body-sm @2xl:min-h-12" />
      <Skeleton className="mt-7 h-lh w-28 scale-y-70 text-price" />
      <TextLines className="mt-3 text-body-sm @2xl:min-h-12" />
      <div className="mt-7 space-y-3 border-t border-border pt-7">
        {FEATURE_IDS.map((feature) => (
          <Skeleton className="h-lh w-4/5 scale-y-70 text-body-sm" key={feature} />
        ))}
      </div>
      <div className="mt-auto pt-10 @2xl:pt-12">
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  </div>
)

const CourseUnlocksPending = ({ courses }: Readonly<{ courses: number }>): JSX.Element => (
  <div className="rounded-xl border border-border bg-card p-6 md:p-8">
    <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-title" />
    <TextLines className="mt-1.5 text-body-sm" />
    <div className="mt-5 divide-y divide-border border-y border-border">
      {Array.from({ length: courses }, (_, course) => (
        <div className="flex items-center gap-3 py-3.5 text-body-sm" key={course}>
          <Skeleton className="size-3.5 shrink-0" />
          <Skeleton className="h-lh w-48 scale-y-70" />
        </div>
      ))}
    </div>
  </div>
)

const LicenseOfferPending = ({ lockedCourses }: Readonly<{ lockedCourses: number }>): JSX.Element => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-lh w-48 scale-y-70 text-title" />
      <TextLines className="text-body-sm" />
    </div>
    <div className="@container">
      <div className="grid overflow-hidden rounded-xl border border-border @2xl:grid-cols-3">
        {TIERS.map((tier) => (
          <TierColumnPending featured={tier === FEATURED_TIER} key={tier} />
        ))}
      </div>
    </div>
    <AgreementPending />
    {lockedCourses > 0 && <CourseUnlocksPending courses={lockedCourses} />}
  </div>
)

const LicenseStatusCardPending = (): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-28 scale-y-70 text-base leading-snug" />
      <Skeleton className="h-lh w-72 max-w-full scale-y-70 text-sm" />
      <CardAction>
        <Skeleton className="h-5 w-14 rounded-4xl" />
      </CardAction>
    </CardHeader>
    <CardContent className="flex flex-wrap items-center justify-between gap-4">
      <Skeleton className="h-lh w-24 scale-y-70 text-lg" />
      <Skeleton className="h-7 w-36 rounded-lg" />
    </CardContent>
  </Card>
)

const LicenseCardPending = (): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-24 scale-y-70 text-base leading-snug" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="space-y-2">
        <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
        <Skeleton className="h-11.5 w-full rounded-md" />
      </div>
      <TextLines className="text-sm" />
      <Skeleton className="h-11.5 w-full rounded-md" />
      <Skeleton className="h-lh w-3/4 scale-y-70 text-xs leading-relaxed" />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Skeleton className="h-7 w-36 rounded-lg" />
        <Skeleton className="h-lh w-56 scale-y-70 text-xs" />
      </div>
    </CardContent>
  </Card>
)

const LicenseActivationsPending = (): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-20 scale-y-70 text-base leading-snug" />
      <TextLines className="text-sm" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <Skeleton className="h-lh w-20 scale-y-70 text-xs" />
      <Skeleton className="h-lh w-56 scale-y-70 text-sm" />
    </CardContent>
  </Card>
)

const PageHeaderPending = (): JSX.Element => (
  <div className="flex flex-col gap-1">
    <Skeleton className="h-lh w-32 scale-y-70 text-statement" />
    <div className="flex flex-col text-sm">
      <Skeleton className="h-lh w-80 max-w-full scale-y-70" />
      <Skeleton className="h-lh w-1/4 scale-y-70 sm:hidden" />
    </div>
  </div>
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

export const AppOverviewPending = (): JSX.Element => {
  const view = usePendingLicenseView()

  return (
    <div aria-busy="true" className="flex w-full flex-col gap-8 pb-8">
      <PageHeaderPending />
      {view.isAwaitingPayment && <ActivationPending />}
      {view.showsChosenTier && <ChosenTierPending />}
      {view.showsLicense && <LicenseStatusCardPending />}
      {view.isBuying && <LicenseOfferPending lockedCourses={view.lockedCourses} />}
      <div className="grid gap-8 sm:grid-cols-2">
        <DocsStepPending />
        <SupportStepPending />
      </div>
    </div>
  )
}

export const AppLicensePending = (): JSX.Element => {
  const view = usePendingLicenseView()

  return (
    <div aria-busy="true" className="flex w-full flex-col gap-8 pb-8">
      <PageHeaderPending />
      {view.isAwaitingPayment && <ActivationPending />}
      {view.showsChosenTier && <ChosenTierPending />}
      {view.showsLicense && <LicenseCardPending />}
      {view.showsLicense && view.hasActivations && <LicenseActivationsPending />}
      {view.isBuying && <LicenseOfferPending lockedCourses={view.lockedCourses} />}
      <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
    </div>
  )
}

export const AppSettingsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col gap-8 pb-8">
    <PageHeaderPending />
    <PreferencesCardPending />
  </div>
)

const APP_PAGES = new Map<string, () => JSX.Element>([
  [ROUTES.APP, AppOverviewPending],
  [ROUTES.APP_LICENSE, AppLicensePending],
  [ROUTES.APP_SETTINGS, AppSettingsPending],
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
