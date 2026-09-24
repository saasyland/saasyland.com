import type { JSX } from "react"

import type { RowData } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { cn } from "~/src/lib/cn"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { TableBody, TableCell, TableRow } from "~/src/presentation/components/shadcn/table"

import type { DataTableInstance } from "~/src/presentation/components/custom/data-table/features"
import { getColumnProps } from "~/src/presentation/components/custom/data-table/utils/data-table-column-style"

const SKELETON_ROW_COUNT = 5
const SPACER_COLUMNS = 1

export const DataTableBody = <TData extends RowData>({ table }: { readonly table: DataTableInstance<TData> }): JSX.Element => {
  const t = useTranslations("components.custom.data-table")

  const classNames = table.options.meta?.classNames
  const { rows } = table.getRowModel()

  if (table.options.meta?.isLoading === true) {
    const columns = [
      ...table.getStartVisibleLeafColumns(),
      ...table.getCenterVisibleLeafColumns(),
      undefined,
      ...table.getEndVisibleLeafColumns(),
    ]

    return (
      <TableBody className={classNames?.body}>
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <TableRow className={classNames?.row} key={index}>
            {columns.map((column) => {
              if (!column) {
                return <TableCell aria-hidden className="p-0" key="spacer" />
              }

              return (
                <TableCell key={column.id} {...getColumnProps(column)}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    )
  }

  if (rows.length === 0) {
    return (
      <TableBody className={classNames?.body}>
        <TableRow>
          <TableCell className="h-24 text-center text-muted-foreground" colSpan={table.getVisibleLeafColumns().length + SPACER_COLUMNS}>
            {t("empty")}
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  return (
    <TableBody className={classNames?.body}>
      {rows.map((row) => {
        const cells = [...row.getStartVisibleCells(), ...row.getCenterVisibleCells(), undefined, ...row.getEndVisibleCells()]

        return (
          <TableRow
            className={cn("bg-background hover:bg-accent", classNames?.row)}
            data-state={row.getIsSelected() ? "selected" : undefined}
            key={row.id}
          >
            {cells.map((cell) => {
              if (!cell) {
                return <TableCell aria-hidden className="p-0" key="spacer" />
              }

              return (
                <TableCell key={cell.id} {...getColumnProps(cell.column)}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              )
            })}
          </TableRow>
        )
      })}
    </TableBody>
  )
}
