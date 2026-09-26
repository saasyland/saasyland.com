import type { JSX } from "react"

import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const PAGE_ROWS = Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => index)

export const TitlePending = (): JSX.Element => <Skeleton className="h-lh w-44 scale-y-70 text-statement" />

export const DescriptionPending = (): JSX.Element => <Skeleton className="h-lh w-96 max-w-full scale-y-70 text-sm" />

export const LongDescriptionPending = (): JSX.Element => (
  <div className="flex flex-col text-sm">
    <Skeleton className="h-lh w-96 max-w-full scale-y-70" />
    <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
  </div>
)

export const IconPending = (): JSX.Element => <Skeleton className="size-4 shrink-0" />

export const CheckboxPending = (): JSX.Element => <Skeleton className="size-4 rounded-[4px]" />

export const SwitchPending = (): JSX.Element => <Skeleton className="h-[18.4px] w-8 shrink-0 rounded-full" />

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
  <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
    <Skeleton className="h-lh w-10 scale-y-70" />
    <div className="flex items-center gap-2">
      <Skeleton className="h-lh w-15 scale-y-70" />
      <Skeleton className="h-7 w-9.5 rounded-lg" />
      <Skeleton className="h-7 w-9.5 rounded-lg" />
    </div>
  </div>
)

export const FieldPending = (): JSX.Element => (
  <div className="flex w-full flex-col gap-2">
    <Skeleton className="h-lh w-28 scale-y-70 text-sm leading-snug" />
    <Skeleton className="h-8 w-full rounded-lg" />
  </div>
)

export const ToggleFieldPending = (): JSX.Element => (
  <div className="flex w-full items-start gap-2">
    <div className="flex flex-1 flex-col gap-0.5 leading-snug">
      <Skeleton className="h-lh w-28 scale-y-70 text-sm leading-snug" />
      <Skeleton className="h-lh w-40 scale-y-70 text-xs" />
    </div>
    <SwitchPending />
  </div>
)

export const UploadZonePending = (): JSX.Element => (
  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40 p-8">
    <Skeleton className="mb-3 size-12 rounded-full" />
    <Skeleton className="mb-1 h-lh w-24 scale-y-70 text-sm" />
    <Skeleton className="h-lh w-44 scale-y-70 text-xs" />
  </div>
)
