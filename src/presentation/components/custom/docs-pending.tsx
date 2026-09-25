import type { JSX } from "react"

import { cn } from "~/src/lib/cn"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const NAV_WIDTHS = ["w-28", "w-20", "w-32", "w-24", "w-36", "w-16", "w-30", "w-22"]
const TEXT_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-5/6", "w-3/4", "w-2/3"]
const TOC_WIDTHS = ["w-24", "w-32", "w-28"]

// Mirrors the Fumadocs docs layout: the sidebar from md, the table of contents from xl.
export const DocsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-dvh w-full">
    <div className="sticky top-0 hidden h-dvh w-67 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-4 md:flex">
      <div className="flex h-7 items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-5" />
      </div>
      <Skeleton className="h-9 rounded-lg border border-border bg-transparent" />
      <div className="mt-6 flex flex-col gap-6 px-2">
        {NAV_WIDTHS.map((width) => (
          <Skeleton key={width} className={cn("h-3", width)} />
        ))}
      </div>
      <Skeleton className="mt-auto h-9 rounded-lg border border-border bg-transparent" />
      <Skeleton className="h-9 rounded-lg border border-border bg-transparent" />
    </div>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:hidden">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-5" />
      </div>
      <div className="h-10 shrink-0 border-b xl:hidden" />
      <div className="mx-auto flex w-full max-w-225 flex-col px-4 pt-6 md:px-6 md:pt-8 xl:px-8 xl:pt-14">
        <Skeleton className="h-9 w-2/3 max-w-sm" />
        <Skeleton className="mt-4 h-5 w-1/2 max-w-xs" />
        <div className="mt-16 flex flex-col gap-3">
          {TEXT_WIDTHS.map((width) => (
            <Skeleton key={width} className={cn("h-4", width)} />
          ))}
        </div>
        <Skeleton className="mt-8 h-28 rounded-xl border border-border bg-transparent" />
      </div>
    </div>
    <div className="sticky top-0 hidden h-dvh w-67 shrink-0 flex-col gap-3 px-4 pt-14 xl:flex">
      {TOC_WIDTHS.map((width) => (
        <Skeleton key={width} className={cn("h-3", width)} />
      ))}
    </div>
  </div>
)
