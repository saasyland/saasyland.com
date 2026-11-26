import type { JSX } from "react"

import { Card, CardContent, CardFooter, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const BUSINESS_FIELDS = ["name", "supportEmail"] as const

const CardHeaderPending = (): JSX.Element => (
  <CardHeader className="border-b">
    <Skeleton className="h-lh w-32 scale-y-70 text-base leading-snug" />
    <Skeleton className="h-lh w-80 max-w-full scale-y-70 text-sm" />
  </CardHeader>
)

export const BusinessProfileCardPending = (): JSX.Element => (
  <Card>
    <CardHeaderPending />
    <CardContent className="flex flex-col gap-7 pb-(--card-spacing)">
      {BUSINESS_FIELDS.map((field) => (
        <div className="flex flex-col gap-2" key={field}>
          <Skeleton className="h-lh w-28 scale-y-70 text-sm leading-none" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-lh w-20 scale-y-70 text-sm leading-none" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-lh w-full max-w-[48ch] scale-y-70 text-sm" />
      </div>
    </CardContent>
    <CardFooter className="justify-end">
      <Skeleton className="h-7 w-28 rounded-md" />
    </CardFooter>
  </Card>
)

export const BusinessLogoCardPending = (): JSX.Element => (
  <Card>
    <CardHeaderPending />
    <CardContent className="flex flex-col gap-4 pb-(--card-spacing)">
      <Skeleton className="size-28 rounded-md" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-lh w-16 scale-y-70 text-sm leading-none" />
        <Skeleton className="h-7 w-40 rounded-md" />
        <div className="flex flex-col text-sm leading-normal">
          <Skeleton className="h-lh w-full max-w-[60ch] scale-y-70" />
          <Skeleton className="h-lh w-2/3 scale-y-70" />
        </div>
      </div>
    </CardContent>
    <CardFooter className="justify-end">
      <Skeleton className="h-7 w-28 rounded-md" />
    </CardFooter>
  </Card>
)
