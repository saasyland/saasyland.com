import type { CSSProperties } from "react"

import type { Column, ColumnPinningPosition, Header, RowData } from "@tanstack/react-table"

import { cn } from "~/src/lib/cn"

import type { DataTableFeatures, DataTableInstance } from "~/src/presentation/components/custom/data-table/features"

export type ColumnAlign = "left" | "right" | "center"

export const alignClass = (align?: ColumnAlign): string | undefined => {
  if (align === "right") {
    return "text-right"
  }

  return align === "center" ? "text-center has-[[role=checkbox]]:px-0" : undefined
}

export const getColumnProps = <TData extends RowData>(column: Column<DataTableFeatures, TData>, pinned = column.getIsPinned()) => ({
  className: cn(
    "relative",
    alignClass(column.columnDef.meta?.align),
    pinned !== false && "sticky z-10 bg-inherit",
    pinned === "start" && "border-r border-border",
    pinned === "end" && "border-l border-border",
  ),
  style: {
    insetInlineEnd: pinned === "end" ? column.getAfter("end") : undefined,
    insetInlineStart: pinned === "start" ? column.getStart("start") : undefined,
    width: column.getSize(),
  } satisfies CSSProperties,
})

export const getHeaderProps = <TData extends RowData>(header: Header<DataTableFeatures, TData>, table: DataTableInstance<TData>) => {
  let pinned: ColumnPinningPosition = false
  if (table.getStartFlatHeaders().includes(header)) {
    pinned = "start"
  } else if (table.getEndFlatHeaders().includes(header)) {
    pinned = "end"
  }

  const width = header.getSize()
  const { className } = getColumnProps(header.column, pinned)

  return {
    className: cn(className, "bg-background"),
    style: {
      insetInlineEnd: pinned === "end" ? table.getEndTotalSize() - header.getStart() - width : undefined,
      insetInlineStart: pinned === "start" ? header.getStart() : undefined,
      width,
    } satisfies CSSProperties,
  }
}
