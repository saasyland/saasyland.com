import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const UpgradeOfferPending = (): JSX.Element => (
  <div className="overflow-hidden rounded-lg border border-ring/40 bg-card">
    <div className="grid gap-x-10 gap-y-7 p-6 md:p-8 lg:grid-cols-[1fr_18rem] lg:items-end">
      <div>
        <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-title" />
        <Skeleton className="mt-2 h-lh w-full max-w-[60ch] scale-y-70 text-body-sm" />
        <Skeleton className="mt-6 h-lh w-24 scale-y-70 text-price" />
        <Skeleton className="mt-2 h-lh w-2/3 scale-y-70 text-body-sm" />
        <Skeleton className="mt-4 h-lh w-3/4 scale-y-70 text-body-sm" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  </div>
)
