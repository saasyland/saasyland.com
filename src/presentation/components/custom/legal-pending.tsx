import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ContentPagePending } from "~/src/presentation/components/custom/content-page"

const LEGAL_SECTIONS = ["first", "second", "third", "fourth"] as const

export const LegalPending = (): JSX.Element => (
  <ContentPagePending>
    <Skeleton className="mt-6 h-lh w-48 scale-y-70 text-spec" />

    <div className="mt-12 flex max-w-3xl flex-col gap-10">
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
  </ContentPagePending>
)
