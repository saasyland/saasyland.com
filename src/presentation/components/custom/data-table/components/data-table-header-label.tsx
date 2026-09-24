import type { JSX, MouseEvent } from "react"

import { batch } from "@tanstack/react-store"
import type { Header, RowData } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { cn } from "~/src/lib/cn"

import type { DataTableFeatures, DataTableInstance } from "~/src/presentation/components/custom/data-table/features"

export const DataTableHeaderLabel = <TData extends RowData>({
  header,
  table,
}: {
  readonly header: Header<DataTableFeatures, TData>
  readonly table: DataTableInstance<TData>
}): JSX.Element => {
  const { column } = header
  const toggleSorting = column.getCanSort() ? column.getToggleSortingHandler() : undefined

  if (!toggleSorting) {
    return <table.FlexRender header={header} />
  }

  const sorted = column.getIsSorted()
  const SortIcon = sorted === false ? ChevronsUpDown : { asc: ArrowUp, desc: ArrowDown }[sorted]

  const handleSort = (event: MouseEvent<HTMLButtonElement>): void => {
    batch(() => {
      toggleSorting(event)
      table.resetPageIndex(true)
    })
  }

  return (
    <button
      className="flex cursor-pointer items-center gap-1.5 text-left transition-colors duration-200 ease-exp hover:text-foreground"
      onClick={handleSort}
      type="button"
    >
      <table.FlexRender header={header} />
      <SortIcon aria-hidden className={cn("size-3.5 shrink-0", sorted === false ? "text-muted-foreground/60" : "text-ring")} />
    </button>
  )
}
