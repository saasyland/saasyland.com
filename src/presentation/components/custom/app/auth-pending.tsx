import type { JSX } from "react"

import { APP_OVERVIEW_SECTIONS } from "~/src/data/app-overview"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { PageHeaderPending } from "~/src/presentation/components/custom/app/pending-blocks"
import { PreferencesCardPending } from "~/src/presentation/components/custom/preferences-card"

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
    <PageHeaderPending />
    {APP_OVERVIEW_SECTIONS.map(({ key, Pending }) => (
      <Pending key={key} />
    ))}
    <div className="grid gap-8 sm:grid-cols-2">
      <DocsStepPending />
      <SupportStepPending />
    </div>
  </div>
)

export const AppSettingsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col gap-8 pb-8">
    <PageHeaderPending />
    <PreferencesCardPending />
  </div>
)
