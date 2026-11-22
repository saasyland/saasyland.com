import type { JSX, ReactNode } from "react"

import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

const PAGE_ROWS = Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => index)

const CONTROL_BUTTONS = ["columns", "export", "reset"] as const

const PAGE_BUTTONS = ["first", "previous", "next", "last"] as const

export interface DataGridPendingColumn {
  readonly cell: ReactNode
  readonly id: string
  readonly width: number
}

export const DataGridPending = ({
  columns,
  isSelectable = false,
}: {
  readonly columns: readonly DataGridPendingColumn[]
  readonly isSelectable?: boolean
}): JSX.Element => (
  <div className="flex min-w-0 flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-8 w-full sm:w-72" />
      <Skeleton className="h-7 w-20" />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Skeleton className="h-7 w-14" />
        {CONTROL_BUTTONS.map((button) => (
          <Skeleton className="h-7 w-9 sm:w-24" key={button} />
        ))}
      </div>
    </div>
    <TableContainer className="max-h-[max(24rem,calc(100dvh-14rem))] overflow-auto rounded-lg border border-border bg-background">
      <Table className="table-fixed border-separate border-spacing-0">
        <colgroup>
          {isSelectable && <col className="w-11" />}
          {columns.map((column) => (
            <col key={column.id} style={{ width: column.width }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {isSelectable && (
              <TableHead className="border-b border-b-border">
                <Skeleton className="size-4 rounded-sm" />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead className="border-b border-b-border" key={column.id}>
                <Skeleton className="h-lh w-16 scale-y-70" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PAGE_ROWS.map((row) => (
            <TableRow className="hover:bg-transparent" key={row}>
              {isSelectable && (
                <TableCell className="border-b border-b-border">
                  <Skeleton className="size-4 rounded-sm" />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell className="border-b border-b-border" key={column.id}>
                  {column.cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-spec">
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
