import type { JSX } from "react"

import type { RowData } from "@tanstack/react-table"

import { TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { DataTableHeaderCell } from "~/src/presentation/components/custom/data-table/components/data-table-header-cell"
import type { DataTableInstance } from "~/src/presentation/components/custom/data-table/features"

export const DataTableHeader = <TData extends RowData>({ table }: { readonly table: DataTableInstance<TData> }): JSX.Element => {
  const headerGroups = Map.groupBy(
    [
      ...table.getStartHeaderGroups(),
      ...table.getCenterHeaderGroups().map(({ depth, headers }) => ({ depth, headers: [...headers, undefined] })),
      ...table.getEndHeaderGroups(),
    ],
    (group) => group.depth,
  )

  return (
    <TableHeader className={table.options.meta?.classNames?.header}>
      {Array.from(headerGroups, ([depth, groups]) => (
        <TableRow key={depth}>
          {groups
            .flatMap((group) => group.headers)
            .map((header) => {
              if (!header) {
                return <TableHead aria-hidden className="bg-background p-0" key="spacer" />
              }

              return <DataTableHeaderCell header={header} key={header.id} table={table} />
            })}
        </TableRow>
      ))}
    </TableHeader>
  )
}
