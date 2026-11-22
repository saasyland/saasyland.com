import type { JSX } from "react"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const UnlicensedOrdersPending = (): JSX.Element => (
  <Card className="flex flex-col gap-4 p-5">
    <div>
      <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-title" />
      <div className="mt-0.5 flex flex-col text-body-sm">
        <Skeleton className="h-lh w-120 max-w-full scale-y-70" />
        <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
      </div>
    </div>
    <div className="flex items-center gap-2 text-body-sm">
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <Skeleton className="h-lh w-64 max-w-full scale-y-70" />
    </div>
  </Card>
)
