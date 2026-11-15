import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const LEGAL_SECTIONS = ["first", "second", "third", "fourth"] as const

export const LegalPending = (): JSX.Element => (
  <div aria-busy="true" className="container mx-auto max-w-3xl px-6 py-16 md:py-24">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-lh w-48 scale-y-70 text-sm" />
      <Skeleton className="h-lh w-1/2 scale-y-70 text-3xl md:text-4xl" />
      <div className="flex flex-col text-base leading-relaxed">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-3/5 scale-y-70" />
      </div>
    </div>
    <div className="mt-12 flex flex-col gap-10">
      {LEGAL_SECTIONS.map((section) => (
        <div className="flex flex-col gap-3" key={section}>
          <Skeleton className="h-lh w-2/5 scale-y-70 text-xl" />
          <div className="flex flex-col text-sm leading-relaxed">
            <Skeleton className="h-lh w-full scale-y-70" />
            <Skeleton className="h-lh w-full scale-y-70" />
            <Skeleton className="h-lh w-2/3 scale-y-70" />
          </div>
        </div>
      ))}
    </div>
  </div>
)
