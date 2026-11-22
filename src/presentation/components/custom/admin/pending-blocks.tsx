import type { JSX } from "react"

import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const PAGE_ROWS = Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => index)

export const IconPending = (): JSX.Element => <Skeleton className="size-4 shrink-0" />

export const CheckboxPending = (): JSX.Element => <Skeleton className="size-4 rounded-sm" />

export const SortableHeadPending = (): JSX.Element => (
  <div className="flex items-center gap-1.5">
    <Skeleton className="h-lh w-12 scale-y-70" />
    <Skeleton className="size-3.5" />
  </div>
)

export const RowActionPending = (): JSX.Element => (
  <div className="flex justify-end p-2">
    <IconPending />
  </div>
)

export const PaginationPending = (): JSX.Element => (
  <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-spec">
    <Skeleton className="h-lh w-10 scale-y-70" />
    <div className="flex items-center gap-2">
      <Skeleton className="h-lh w-15 scale-y-70" />
      <Skeleton className="h-7 w-9.5 rounded-md" />
      <Skeleton className="h-7 w-9.5 rounded-md" />
    </div>
  </div>
)

export const FieldPending = (): JSX.Element => (
  <div className="flex w-full flex-col gap-2">
    <Skeleton className="h-lh w-28 scale-y-70 text-sm leading-snug" />
    <Skeleton className="h-8 w-full rounded-md" />
  </div>
)
