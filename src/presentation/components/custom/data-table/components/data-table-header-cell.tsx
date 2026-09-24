import type { JSX } from "react"

import type { Header, RowData } from "@tanstack/react-table"

import { TableHead } from "~/src/presentation/components/shadcn/table"

import { DataTableHeaderLabel } from "~/src/presentation/components/custom/data-table/components/data-table-header-label"
import { DataTableResizeHandle } from "~/src/presentation/components/custom/data-table/components/data-table-resize-handle"
import type { DataTableFeatures, DataTableInstance } from "~/src/presentation/components/custom/data-table/features"
import { ariaSort } from "~/src/presentation/components/custom/data-table/utils/data-table-aria"
import { getHeaderProps } from "~/src/presentation/components/custom/data-table/utils/data-table-column-style"

export const DataTableHeaderCell = <TData extends RowData>({
  header,
  table,
}: {
  readonly header: Header<DataTableFeatures, TData>
  readonly table: DataTableInstance<TData>
}): JSX.Element => (
  <TableHead {...getHeaderProps(header, table)} aria-sort={ariaSort(header.column.getIsSorted())} colSpan={header.colSpan}>
    {!header.isPlaceholder && (
      <>
        <DataTableHeaderLabel header={header} table={table} />
        {header.column.getCanResize() && <DataTableResizeHandle header={header} />}
      </>
    )}
  </TableHead>
)
