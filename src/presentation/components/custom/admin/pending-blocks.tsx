import type { JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const IconPending = (): JSX.Element => <Skeleton className="size-4 shrink-0" />

export const RowActionPending = (): JSX.Element => (
  <div className="flex justify-end p-2">
    <IconPending />
  </div>
)

export const FieldPending = (): JSX.Element => (
  <div className="flex w-full flex-col gap-2">
    <Skeleton className="h-lh w-28 scale-y-70 text-sm leading-snug" />
    <Skeleton className="h-8 w-full rounded-md" />
  </div>
)
