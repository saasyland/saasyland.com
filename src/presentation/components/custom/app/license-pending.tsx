import type { JSX } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useRouterState } from "@tanstack/react-router"

import { LICENSE_STATUS, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { appSearchSchema } from "~/src/data/app"
import { CLI_LICENSE_COMMANDS } from "~/src/data/cli"
import { LICENSE_OFFER_SECTIONS } from "~/src/data/license-offer"

import { cn } from "~/src/lib/cn"

import { Card, CardAction, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { PageHeaderPending } from "~/src/presentation/components/custom/app/core-pending"
import { FEATURED_TIER, FEATURE_IDS } from "~/src/presentation/components/custom/pricing"

const usePendingLicenseView = () => {
  const queryClient = useQueryClient()
  const search = useRouterState({ select: ({ location }) => appSearchSchema.parse(location.search) })

  const license = queryClient.getQueryData(currentLicenseQuery.queryKey)?.license
  const hasActiveLicense = license?.status === LICENSE_STATUS.ACTIVE
  const isBuying = search.checkoutId === undefined && !hasActiveLicense

  return {
    hasActivations: typeof license?.polarLicenseKeyId === "string",
    isAwaitingPayment: search.checkoutId !== undefined,
    isBuying,
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

const LicenseOfferPending = (): JSX.Element => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-lh w-48 scale-y-70 text-title" />
      <TextLines className="text-body-sm" />
    </div>
    <div className="@container">
      <div className="grid overflow-hidden rounded-xl border border-border @2xl:grid-cols-3">
        {LICENSE_TIERS.map((tier) => (
          <TierColumnPending featured={tier === FEATURED_TIER} key={tier} />
        ))}
      </div>
    </div>
    <AgreementPending />
    {LICENSE_OFFER_SECTIONS.map(({ key, Pending }) => (
      <Pending key={key} />
    ))}
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
      <div className="flex flex-col gap-3">
        {CLI_LICENSE_COMMANDS.map((command) => (
          <div className="space-y-1.5" key={command}>
            <Skeleton className="h-11.5 w-full rounded-md" />
            <Skeleton className="h-lh w-2/3 scale-y-70 text-sm" />
          </div>
        ))}
      </div>
      <Skeleton className="h-lh w-1/2 scale-y-70 text-sm" />
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
      {view.isBuying && <LicenseOfferPending />}
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
      {view.isBuying && <LicenseOfferPending />}
      <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
    </div>
  )
}
