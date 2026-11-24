import type { JSX } from "react"

import { USER_LICENSE_DETAILS } from "~/src/data/license"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const CustomerMachinesPending = (): JSX.Element => <Skeleton className="h-lh w-24 scale-y-70 text-sm" />

export const UserLicensePending = (): JSX.Element => (
  <Card>
    <CardHeader className="border-b">
      <Skeleton className="h-lh w-20 scale-y-70 text-base leading-snug" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="divide-y divide-border text-sm">
        {USER_LICENSE_DETAILS.map((detail) => (
          <div className="flex items-center justify-between gap-4 py-2.5" key={detail}>
            <Skeleton className="h-lh w-28 scale-y-70" />
            <Skeleton className="h-lh w-20 scale-y-70" />
          </div>
        ))}
        <div className="flex flex-col gap-1 py-2.5">
          <Skeleton className="h-lh w-16 scale-y-70" />
          <div className="flex flex-col">
            <Skeleton className="h-lh w-full scale-y-70" />
            <Skeleton className="h-lh w-2/3 scale-y-70" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-4 text-sm">
        <Skeleton className="h-lh w-32 scale-y-70" />
        <Skeleton className="h-lh w-24 scale-y-70" />
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-lh w-40 scale-y-70" />
          <Skeleton className="h-lh w-48 scale-y-70 text-spec" />
        </div>
      </div>
    </CardContent>
  </Card>
)

export const UserWithdrawalsPending = (): JSX.Element => (
  <Card>
    <CardHeader className="border-b">
      <Skeleton className="h-lh w-44 scale-y-70 text-base leading-snug" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-sm" />
    </CardContent>
  </Card>
)
