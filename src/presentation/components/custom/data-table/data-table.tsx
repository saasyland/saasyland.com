import type { JSX } from "react"

import { type UseQueryOptions, keepPreviousData, skipToken, useQuery } from "@tanstack/react-query"
import { useCreateAtom, useSelector } from "@tanstack/react-store"
import { type PaginationState, type SortingState, useTable } from "@tanstack/react-table"

import { DEFAULT_PAGINATION } from "~/src/modules/_core/utils/pagination"

import { cn } from "~/src/lib/cn"

import { Table, TableContainer } from "~/src/presentation/components/shadcn/table"

import { DataTableBody } from "~/src/presentation/components/custom/data-table/components/data-table-body"
import { DataTableHeader } from "~/src/presentation/components/custom/data-table/components/data-table-header"
import { DataTablePagination } from "~/src/presentation/components/custom/data-table/components/data-table-pagination"
import { type DataTableColumnDef, type DataTableOptions, dataTableFeatures } from "~/src/presentation/components/custom/data-table/features"

const EMPTY_DATA: never[] = []

export interface DataTableProps<TData extends { id: string }> {
  readonly columns: DataTableColumnDef<TData>[]
  readonly data?: TData[] | undefined
  readonly isLoading?: boolean
  readonly options?: DataTableOptions<TData>
  readonly query?: (
    state: PaginationState & { sorting: SortingState },
  ) => Pick<UseQueryOptions<{ rows: TData[]; total: number }>, "queryKey" | "queryFn">
}

export const DataTable = <TData extends { id: string }>({
  columns,
  data = EMPTY_DATA,
  isLoading = false,
  options,
  query,
}: Readonly<DataTableProps<TData>>): JSX.Element => {
  const pagination = useCreateAtom(options?.initialState?.pagination ?? DEFAULT_PAGINATION)
  const sorting = useCreateAtom<SortingState>(options?.initialState?.sorting ?? [])
  const pageState = useSelector(pagination)
  const sortState = useSelector(sorting)
  const queryOptions = query?.({ ...pageState, sorting: sortState })
  const page = useQuery({
    ...queryOptions,
    placeholderData: keepPreviousData,
    queryFn: queryOptions?.queryFn ?? skipToken,
    queryKey: queryOptions?.queryKey ?? ["data-table"],
    throwOnError: true,
  })
  const table = useTable({
    columnResizeMode: "onChange",
    columns,
    data: page.data?.rows ?? data,
    features: dataTableFeatures,
    getRowId: (row) => row.id,
    ...options,
    atoms: { pagination, sorting },
    ...(query ? { autoResetPageIndex: false, manualPagination: true, manualSorting: true, rowCount: page.data?.total ?? 0 } : {}),
    initialState: { pagination: DEFAULT_PAGINATION, ...options?.initialState },
    meta: { ...options?.meta, isLoading: isLoading || (query !== undefined && (page.isPending || page.isPlaceholderData)) },
  })
  const classNames = table.options.meta?.classNames

  return (
    <>
      <TableContainer className={classNames?.container}>
        <Table
          className={cn(
            "table-fixed border-separate border-spacing-0",
            "[&_:is(th,td)]:border-b [&_:is(th,td)]:border-border [&_tbody_tr:last-child_td]:border-b-0",
            classNames?.table,
          )}
          style={{ minWidth: table.getTotalSize() }}
        >
          <DataTableHeader table={table} />
          <DataTableBody table={table} />
        </Table>
      </TableContainer>
      <DataTablePagination table={table} />
    </>
  )
}
