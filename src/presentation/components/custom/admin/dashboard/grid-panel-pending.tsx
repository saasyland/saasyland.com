import type { ComponentProps, JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { DataGridPending } from "~/src/presentation/components/custom/data-grid-pending"

export const GridPanelPending = (grid: ComponentProps<typeof DataGridPending>): JSX.Element => (
  <section className="flex flex-col gap-4">
    <div className="max-w-2xl">
      <Skeleton className="h-lh w-48 max-w-full scale-y-70 text-title" />
      <div className="mt-0.5 flex flex-col text-body-sm">
        <Skeleton className="h-lh w-120 max-w-full scale-y-70" />
        <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
      </div>
    </div>
    <DataGridPending {...grid} />
  </section>
)
