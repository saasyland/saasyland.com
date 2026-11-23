import type { JSX, ReactNode } from "react"

import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

const CONTROL_BUTTONS = ["columns", "export", "reset"] as const

const PAGE_BUTTONS = ["first", "previous", "next", "last"] as const

export interface DataGridPendingColumn {
  readonly cell: ReactNode
  readonly id: string
  readonly width: number
}

export const DataGridPending = ({
  actionsWidth,
  columns,
  hasSearch = true,
  isSelectable = false,
  rows = DEFAULT_PAGE_SIZE,
}: {
  readonly actionsWidth?: number
  readonly columns: readonly DataGridPendingColumn[]
  readonly hasSearch?: boolean
  readonly isSelectable?: boolean
  readonly rows?: number
}): JSX.Element => (
  <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2.5">
      {hasSearch && <Skeleton className="h-8 min-w-56 flex-1 basis-72" />}
      <Skeleton className="h-8 w-20" />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-16" />
        {CONTROL_BUTTONS.map((button) => (
          <Skeleton className="h-8 w-9 sm:w-24" key={button} />
        ))}
      </div>
    </div>
    <TableContainer className="grid-scroller max-h-[max(24rem,calc(100dvh-16rem))] overflow-auto">
      <Table className="table-fixed border-separate border-spacing-0">
        <colgroup>
          {isSelectable && <col className="w-11" />}
          {columns.map((column) => (
            <col key={column.id} style={{ width: column.width }} />
          ))}
          {actionsWidth !== undefined && <col style={{ width: actionsWidth }} />}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {isSelectable && (
              <TableHead className="h-10 border-b border-b-border/70 bg-(--grid-head)">
                <Skeleton className="size-4 rounded-sm" />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead className="h-10 border-b border-b-border/70 bg-(--grid-head)" key={column.id}>
                <Skeleton className="h-lh w-16 scale-y-70" />
              </TableHead>
            ))}
            {actionsWidth !== undefined && <TableHead className="h-10 border-b border-b-border/70 bg-(--grid-head)" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, row) => (
            <TableRow className="hover:bg-transparent" key={row}>
              {isSelectable && (
                <TableCell className="border-b border-b-border/70">
                  <Skeleton className="size-4 rounded-sm" />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell className="border-b border-b-border/70" key={column.id}>
                  {column.cell}
                </TableCell>
              ))}
              {actionsWidth !== undefined && (
                <TableCell className="border-b border-b-border/70">
                  <Skeleton className="ml-auto size-7 rounded-md" />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 px-3 py-2 text-spec">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-lh w-20 scale-y-70" />
          <Skeleton className="h-7 w-18" />
        </div>
        <Skeleton className="h-lh w-16 scale-y-70" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="mr-2 h-lh w-16 scale-y-70" />
        {PAGE_BUTTONS.map((button) => (
          <Skeleton className="size-7" key={button} />
        ))}
      </div>
    </div>
  </div>
)
