import type { JSX } from "react"

import { Card, CardContent, CardFooter, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const PreferencesCardPending = (): JSX.Element => (
  <Card>
    <CardHeader className="border-b">
      <Skeleton className="h-lh w-28 scale-y-70 text-base leading-snug" />
      <Skeleton className="h-lh w-80 max-w-full scale-y-70 text-sm" />
    </CardHeader>
    <CardContent className="flex flex-col gap-2 pb-(--card-spacing)">
      <Skeleton className="h-lh w-20 scale-y-70 text-sm leading-none" />
      <Skeleton className="h-8 w-full rounded-lg" />
      <div className="flex flex-col text-sm leading-normal">
        <Skeleton className="h-lh w-full max-w-[60ch] scale-y-70" />
        <Skeleton className="h-lh w-1/2 scale-y-70 sm:hidden" />
      </div>
      <Skeleton className="h-7 w-48 rounded-lg" />
    </CardContent>
    <CardFooter className="justify-end">
      <Skeleton className="h-7 w-36 rounded-lg" />
    </CardFooter>
  </Card>
)
