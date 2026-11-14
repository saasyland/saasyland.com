import type { JSX } from "react"

import { PACKAGE_MANAGERS } from "~/src/data/cli"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const HomePending = (): JSX.Element => (
  <section aria-busy="true" className="relative overflow-hidden">
    <div className="field-grid pointer-events-none absolute inset-0" />
    <div className="relative mx-auto w-full max-w-7xl px-6 pt-32 pb-16 md:px-10 md:pt-40 md:pb-20">
      <div className="flex max-w-[11.6em] flex-col text-display-hero">
        <Skeleton className="h-lh w-full scale-y-75" />
        <Skeleton className="h-lh w-11/12 scale-y-75" />
        <Skeleton className="h-lh w-3/5 scale-y-75" />
      </div>
      <div className="mt-6 flex max-w-2xl flex-col text-lead">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-11/12 scale-y-70" />
        <Skeleton className="h-lh w-1/3 scale-y-70" />
      </div>
      <div className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-4">
        <Skeleton className="h-11 w-33 rounded-lg" />
        <Skeleton className="h-11 w-40 rounded-lg border border-border bg-card/60" />
      </div>
      <div className="mt-16 overflow-hidden rounded-xl border border-border bg-card md:mt-20">
        <div className="flex h-10 items-center gap-1 bg-background/40 px-2">
          {PACKAGE_MANAGERS.map((manager) => (
            <Skeleton className="h-7 w-12 rounded-md" key={manager.id} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-border bg-background/40 py-2 pr-2 pl-4">
          <Skeleton className="h-lh w-64 scale-y-70 font-mono text-spec" />
          <Skeleton className="size-7 rounded-md" />
        </div>
        <Skeleton className="aspect-8/5 w-[190%] max-w-none rounded-none sm:w-[135%] md:w-full" />
      </div>
    </div>
  </section>
)
