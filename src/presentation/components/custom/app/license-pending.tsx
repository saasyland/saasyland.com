import type { JSX } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useRouterState } from "@tanstack/react-router"

import { LICENSE_STATUS, LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"
import { hasReachedTier } from "~/src/modules/license/license.upgrades"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { CLI_KEY_LINES, CLI_SETUP_LINES } from "~/src/data/cli"
import { licenseSearchSchema } from "~/src/data/license"
import { FEATURE_STATUS, FEATURE_STATUSES } from "~/src/data/navigation.constants"

import { cn } from "~/src/lib/cn"

import { Card, CardAction, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { CourseUnlocksPending } from "~/src/presentation/components/custom/app/course-unlocks"
import { PageHeaderPending } from "~/src/presentation/components/custom/app/pending-blocks"
import { UpgradeOfferPending } from "~/src/presentation/components/custom/app/upgrade-offer"
import { FEATURED_TIER, PRICING_TRUST_ITEMS, tierFeaturesWith } from "~/src/presentation/components/custom/pricing"

const usePendingLicenseView = () => {
  const queryClient = useQueryClient()
  const search = useRouterState({ select: ({ location }) => licenseSearchSchema.parse(location.search) })

  const license = queryClient.getQueryData(currentLicenseQuery.queryKey)?.license
  const hasActiveLicense = license?.status === LICENSE_STATUS.ACTIVE
  const isBuying = search.checkoutId === undefined && !hasActiveLicense

  const showsLicense = license !== undefined && (hasActiveLicense || search.checkoutId === undefined)

  return {
    hasActivations: hasActiveLicense && typeof license.polarLicenseKeyId === "string",
    hasActiveLicense,
    hasPaymentActivated: search.checkoutId !== undefined && hasReachedTier(license, search.tier),
    isAwaitingPayment: search.checkoutId !== undefined,
    isBuying,
    showsChosenTier: isBuying && search.tier !== undefined,
    showsLicense,
    showsUpgrade: search.checkoutId === undefined && hasActiveLicense && search.tier !== undefined,
  }
}

const TextLines = ({ className }: Readonly<{ className: string }>): JSX.Element => (
  <div className={cn("flex w-full flex-col", className)}>
    <Skeleton className="h-lh w-full max-w-[60ch] scale-y-70" />
    <Skeleton className="h-lh w-2/3 scale-y-70 sm:hidden" />
  </div>
)

const ActivationPending = (): JSX.Element => (
  <div className="flex items-start gap-5 rounded-lg border border-border bg-card p-6 md:p-8">
    <Skeleton className="size-11 shrink-0 rounded-full" />
    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
      <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-title" />
      <TextLines className="text-body-sm" />
    </div>
  </div>
)

const CheckoutNoticePending = (): JSX.Element => (
  <div className="flex max-w-[72ch] flex-col gap-1.5 text-spec leading-relaxed">
    <Skeleton className="h-lh w-full scale-y-70" />
    <Skeleton className="h-lh w-3/4 scale-y-70" />
    <Skeleton className="h-lh w-1/2 scale-y-70" />
  </div>
)

const ChosenTierPending = (): JSX.Element => (
  <div className="overflow-hidden rounded-lg border border-ring/40 bg-card">
    <div className="grid gap-x-10 gap-y-7 p-6 md:p-8 lg:grid-cols-[1fr_18rem] lg:items-end">
      <div>
        <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-title" />
        <TextLines className="mt-2 text-body-sm" />
        <div className="mt-6 flex items-baseline gap-2">
          <Skeleton className="h-lh w-24 scale-y-70 text-price" />
          <Skeleton className="h-lh w-16 scale-y-70 text-spec" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
    <div className="border-t border-border px-6 py-4 md:px-8">
      <CheckoutNoticePending />
    </div>
  </div>
)

const TierFeaturesPending = ({ tier }: Readonly<{ tier: LicenseTier }>): JSX.Element => (
  <div className="mt-7 space-y-6 border-t border-border pt-7">
    {FEATURE_STATUSES.map((status) => (
      <div key={status}>
        <Skeleton className="h-lh w-24 scale-y-70 text-label" />
        <div className="mt-3 space-y-3">
          {tierFeaturesWith(tier, status).map((feature) => (
            <Skeleton className="h-lh w-4/5 scale-y-70 text-body-sm" key={feature.id} />
          ))}
          {status === FEATURE_STATUS.AVAILABLE && <Skeleton className="h-lh w-4/5 scale-y-70 text-body-sm" />}
        </div>
      </div>
    ))}
  </div>
)

const TierColumnPending = ({ featured, tier }: Readonly<{ featured: boolean; tier: LicenseTier }>): JSX.Element => (
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
      <div className="mt-7 @2xl:order-last @2xl:mt-auto @2xl:pt-12">
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
      <TierFeaturesPending tier={tier} />
    </div>
  </div>
)

const PricingTrustPending = (): JSX.Element => (
  <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
    {PRICING_TRUST_ITEMS.map((item) => (
      <div className="flex items-start gap-3" key={item}>
        <Skeleton className="mt-0.5 size-4 shrink-0" />
        <TextLines className="text-body-sm" />
      </div>
    ))}
  </div>
)

const TiersPending = (): JSX.Element => (
  <div className="@container">
    <div className="grid overflow-hidden rounded-lg border border-border @2xl:grid-cols-3">
      {LICENSE_TIERS.map((tier) => (
        <TierColumnPending featured={tier === FEATURED_TIER} key={tier} tier={tier} />
      ))}
    </div>
    <PricingTrustPending />
  </div>
)

const LicenseOfferPending = ({ hasChosenTier }: Readonly<{ hasChosenTier: boolean }>): JSX.Element => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-lh w-48 scale-y-70 text-title" />
      <TextLines className="text-body-sm" />
    </div>
    {!hasChosenTier && <TiersPending />}
    {!hasChosenTier && <CheckoutNoticePending />}
    {hasChosenTier && <Skeleton className="h-lh w-32 scale-y-70 text-body-sm" />}
    <CourseUnlocksPending />
  </div>
)

const LicenseStatusCardPending = (): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-28 scale-y-70 text-base leading-snug" />
      <Skeleton className="h-lh w-72 max-w-full scale-y-70 text-sm" />
      <CardAction>
        <Skeleton className="h-5.5 w-14 rounded-md" />
      </CardAction>
    </CardHeader>
    <CardContent className="flex flex-wrap items-center justify-between gap-4">
      <Skeleton className="h-lh w-24 scale-y-70 text-lg" />
      <Skeleton className="h-7 w-36 rounded-md" />
    </CardContent>
  </Card>
)

const CommandLinePending = (): JSX.Element => <Skeleton className="h-10.5 w-full rounded-md" />

const ActiveLicensePending = (): JSX.Element => (
  <>
    <div className="space-y-2">
      <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
      <CommandLinePending />
    </div>
    <TextLines className="text-sm" />
    <div className="flex flex-col gap-4">
      {CLI_KEY_LINES.map(({ id }) => (
        <div className="space-y-1.5" key={id}>
          <CommandLinePending />
          <Skeleton className="h-lh w-2/3 scale-y-70 text-sm" />
        </div>
      ))}
    </div>
    <Skeleton className="h-lh w-1/2 scale-y-70 text-sm" />
  </>
)

const InactiveLicensePending = (): JSX.Element => (
  <div className="flex flex-col items-start gap-4">
    <Skeleton className="h-lh w-3/4 scale-y-70 text-sm" />
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-7 w-36 rounded-md" />
      <Skeleton className="h-7 w-28 rounded-md" />
    </div>
  </div>
)

const LicenseCardPending = ({ isActive }: Readonly<{ isActive: boolean }>): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-24 scale-y-70 text-base leading-snug" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      {isActive && <ActiveLicensePending />}
      {!isActive && <InactiveLicensePending />}
      <Skeleton className="h-lh w-3/4 scale-y-70 text-spec leading-relaxed" />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Skeleton className="h-7 w-36 rounded-md" />
        {isActive && <Skeleton className="h-lh w-56 scale-y-70 text-spec" />}
      </div>
    </CardContent>
  </Card>
)

const GetStartedPending = (): JSX.Element => (
  <div className="rounded-lg border border-border bg-card p-6 md:p-8">
    <Skeleton className="h-lh w-40 scale-y-70 text-title" />
    <TextLines className="mt-1.5 text-body-sm" />
    <div className="mt-5 flex max-w-md flex-col gap-3">
      <Skeleton className="h-lh w-28 scale-y-70 text-spec" />
      <Skeleton className="h-1 w-full rounded-full" />
    </div>
    <div className="mt-5 divide-y divide-border border-y border-border">
      <div className="flex gap-4 py-4">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <Skeleton className="h-lh w-40 scale-y-70 text-body-sm" />
      </div>
      <div className="flex gap-4 py-4">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <Skeleton className="h-lh w-48 scale-y-70 text-body-sm" />
          <CommandLinePending />
        </div>
      </div>
      {CLI_SETUP_LINES.map(({ id }) => (
        <div className="flex gap-4 py-4" key={id}>
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-body-sm" />
            <CommandLinePending />
            <TextLines className="text-body-sm" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const LicenseActivationsPending = (): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-20 scale-y-70 text-base leading-snug" />
      <TextLines className="text-sm" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <Skeleton className="h-lh w-20 scale-y-70 text-spec" />
      <Skeleton className="h-lh w-56 scale-y-70 text-sm" />
    </CardContent>
  </Card>
)

export const WithdrawalCardPending = (): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-24 scale-y-70 text-base leading-snug" />
      <Skeleton className="h-lh w-80 max-w-full scale-y-70 text-sm" />
    </CardHeader>
    <CardContent className="flex flex-col items-start gap-4">
      <TextLines className="text-sm" />
      <Skeleton className="h-7 w-52 rounded-md" />
    </CardContent>
  </Card>
)

export const LicenseOverviewPending = (): JSX.Element => {
  const view = usePendingLicenseView()

  return (
    <>
      {view.isAwaitingPayment && <ActivationPending />}
      {view.hasPaymentActivated && <GetStartedPending />}
      {view.showsChosenTier && <ChosenTierPending />}
      {view.showsUpgrade && <UpgradeOfferPending />}
      {view.showsLicense && <LicenseStatusCardPending />}
      {view.hasActiveLicense && !view.isAwaitingPayment && <GetStartedPending />}
      {view.isBuying && <LicenseOfferPending hasChosenTier={view.showsChosenTier} />}
    </>
  )
}

export const AppLicensePending = (): JSX.Element => {
  const view = usePendingLicenseView()

  return (
    <div aria-busy="true" className="flex w-full flex-col gap-8 pb-8">
      <PageHeaderPending />
      {view.isAwaitingPayment && <ActivationPending />}
      {view.hasPaymentActivated && <GetStartedPending />}
      {view.showsChosenTier && <ChosenTierPending />}
      {view.showsUpgrade && <UpgradeOfferPending />}
      {view.showsLicense && <LicenseCardPending isActive={view.hasActiveLicense} />}
      {view.hasActivations && <LicenseActivationsPending />}
      {view.hasActiveLicense && <WithdrawalCardPending />}
      {view.isBuying && <LicenseOfferPending hasChosenTier={view.showsChosenTier} />}
      <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
    </div>
  )
}
