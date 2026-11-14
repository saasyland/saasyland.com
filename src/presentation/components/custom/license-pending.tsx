import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const PremiumPending = (): JSX.Element => (
  <div aria-busy="true">
    <Skeleton className="h-lh w-40 scale-y-70" />
  </div>
)
