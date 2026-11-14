import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { PreferencesCardPending } from "~/src/presentation/components/custom/preferences-card"

export const PageHeaderPending = (): JSX.Element => (
  <div className="flex flex-col gap-1">
    <Skeleton className="h-lh w-32 scale-y-70 text-statement" />
    <div className="flex flex-col text-sm">
      <Skeleton className="h-lh w-80 max-w-full scale-y-70" />
      <Skeleton className="h-lh w-1/4 scale-y-70 sm:hidden" />
    </div>
  </div>
)

export const AppSettingsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col gap-8 pb-8">
    <PageHeaderPending />
    <PreferencesCardPending />
  </div>
)
