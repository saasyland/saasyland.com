import type { JSX } from "react"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ContentPagePending } from "~/src/presentation/components/custom/content-page"

export const NewsletterPending = (): JSX.Element => (
  <ContentPagePending>
    <Skeleton className="mt-6 h-lh w-full max-w-xl scale-y-70 text-body-sm" />
    <Skeleton className="mt-10 h-11 w-40 rounded-md" />
  </ContentPagePending>
)

export const NewsletterCardPending = (): JSX.Element => (
  <Card>
    <CardHeader className="border-b">
      <Skeleton className="h-lh w-28 scale-y-70 text-base leading-snug" />
      <Skeleton className="h-lh w-96 max-w-full scale-y-70 text-sm" />
    </CardHeader>
    <CardContent className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-[18.4px] w-8 rounded-full" />
        <Skeleton className="h-lh w-40 scale-y-70 text-sm" />
      </div>
      <div className="flex flex-col text-sm">
        <Skeleton className="h-lh w-full max-w-[60ch] scale-y-70" />
        <Skeleton className="h-lh w-1/2 scale-y-70 sm:hidden" />
      </div>
    </CardContent>
  </Card>
)
