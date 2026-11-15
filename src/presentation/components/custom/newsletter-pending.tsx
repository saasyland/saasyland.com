import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const NewsletterPending = (): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-32 md:py-40">
      <Skeleton className="h-lh w-4/5 max-w-sm scale-y-75 text-headline-peak" />
      <div className="mt-5 flex w-full flex-col items-center text-lead">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-3/5 scale-y-70" />
      </div>
      <Skeleton className="mt-8 h-lh w-4/5 scale-y-70 text-body-sm" />
      <Skeleton className="mt-10 h-lh w-28 scale-y-70 text-body-sm" />
    </div>
  </section>
)
