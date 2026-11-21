import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ContentPagePending } from "~/src/presentation/components/custom/content-page"

export const NewsletterPending = (): JSX.Element => (
  <ContentPagePending>
    <Skeleton className="mt-6 h-lh w-full max-w-xl scale-y-70 text-body-sm" />
    <Skeleton className="mt-10 h-11 w-40 rounded-md" />
  </ContentPagePending>
)
