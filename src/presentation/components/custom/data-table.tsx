import { type JSX, useMemo, useState } from "react"

import { type UseQueryOptions, keepPreviousData, skipToken, useQuery } from "@tanstack/react-query"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type ReactTable,
  type RowSelectionState,
  type SortingState,
  type Updater,
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { DEFAULT_PAGINATION } from "~/src/modules/_core/utils/pagination"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

const features = tableFeatures({
  columnFilteringFeature,
  filterFns: { includesString: filterFn_includesString },
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text },
  sortedRowModel: createSortedRowModel(),
})

export type DataTableFeatures = typeof features

export type DataTableColumnDef<TData extends { id: string }> = ColumnDef<DataTableFeatures, TData>

export interface DataTableOptions<TData extends { id: string }> {
  readonly initialState?: { readonly pagination?: PaginationState; readonly sorting?: SortingState }
  readonly query?: (
    state: PaginationState & { sorting: SortingState },
  ) => Pick<UseQueryOptions<{ rows: TData[]; total: number }>, "queryFn" | "queryKey">
  readonly selectable?: boolean
}

export type DataTableFilter =
  | { readonly columnId: string; readonly placeholder: string; readonly type: "search" }
  | {
      readonly columnId: string
      readonly label: string
      readonly options: readonly { readonly label: string; readonly value: string }[]
      readonly type: "select"
    }

export interface DataTableProps<TData extends { id: string }> {
  readonly columns: DataTableColumnDef<TData>[]
  readonly data?: readonly TData[]
  readonly filters?: readonly DataTableFilter[]
  readonly options?: DataTableOptions<TData>
}

const EMPTY_DATA: never[] = []
const FIRST_PAGE = 1
const SKELETON_ROWS = ["first", "second", "third", "fourth", "fifth"] as const
const ALL_VALUES = "all"

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown, none: ChevronsUpDown } as const
const ARIA_SORT = { asc: "ascending", desc: "descending", none: "none" } as const

const keepFirstPage = (pagination: PaginationState): PaginationState => {
  if (pagination.pageIndex === 0) {
    return pagination
  }

  return { ...pagination, pageIndex: 0 }
}

const DataTableFilterControl = ({
  filter,
  onChange,
}: {
  readonly filter: DataTableFilter
  readonly onChange: (value: string | undefined) => void
}): JSX.Element => {
  if (filter.type === "search") {
    return (
      <div className="group relative flex-1">
        <Search
          aria-hidden
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
        />
        <Input
          aria-label={filter.placeholder}
          className="h-10 w-full pl-10"
          onChange={(event) => {
            onChange(event.target.value)
          }}
          placeholder={filter.placeholder}
        />
      </div>
    )
  }

  return (
    <Select
      aria-label={filter.label}
      className="w-full sm:w-48"
      defaultValue={ALL_VALUES}
      onChange={(key) => {
        onChange(key === ALL_VALUES || key === null ? undefined : String(key))
      }}
    >
      <SelectTrigger className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem id={ALL_VALUES}>{filter.label}</SelectItem>
        {filter.options.map((option) => (
          <SelectItem id={option.value} key={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const useSelectableColumns = <TData extends { id: string }>(
  columns: DataTableColumnDef<TData>[],
  selectable: boolean,
): DataTableColumnDef<TData>[] => {
  const t = useTranslations("components.custom.data-table")

  return useMemo((): DataTableColumnDef<TData>[] => {
    if (!selectable) {
      return columns
    }

    const helper = createColumnHelper<DataTableFeatures, TData>()

    return [
      helper.display({
        cell: ({ row }) => (
          <Checkbox
            aria-label={t("selectRow")}
            isDisabled={!row.getCanSelect()}
            isSelected={row.getIsSelected()}
            onChange={(selected) => {
              row.toggleSelected(selected)
            }}
          />
        ),
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            aria-label={t("selectAll")}
            isIndeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
            isSelected={table.getIsAllPageRowsSelected()}
            onChange={(selected) => {
              table.toggleAllPageRowsSelected(selected)
            }}
          />
        ),
        id: "select",
      }),
      ...columns,
    ]
  }, [columns, selectable, t])
}

const DataTablePagination = <TData extends { id: string }>({
  isLoading,
  selectedCount,
  table,
}: {
  readonly isLoading: boolean
  readonly selectedCount: number
  readonly table: ReactTable<DataTableFeatures, TData>
}): JSX.Element => {
  const t = useTranslations("components.custom.data-table.pagination")
  const { pageIndex } = table.state.pagination

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{t("rowCount", { count: table.getRowCount() })}</span>
        {selectedCount > 0 && <span>{t("selectedCount", { selected: selectedCount })}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span>{t("pageIndicator", { current: pageIndex + FIRST_PAGE, total: Math.max(table.getPageCount(), FIRST_PAGE) })}</span>
        <Button
          aria-label={t("previousPage")}
          isDisabled={isLoading || !table.getCanPreviousPage()}
          onPress={() => {
            table.previousPage()
          }}
          size="sm"
          variant="outline"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          aria-label={t("nextPage")}
          isDisabled={isLoading || !table.getCanNextPage()}
          onPress={() => {
            table.nextPage()
          }}
          size="sm"
          variant="outline"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export const DataTable = <TData extends { id: string }>({
  columns,
  data = EMPTY_DATA,
  filters,
  options,
}: DataTableProps<TData>): JSX.Element => {
  const t = useTranslations("components.custom.data-table")
  const [pagination, setPagination] = useState<PaginationState>(options?.initialState?.pagination ?? DEFAULT_PAGINATION)
  const [sorting, setSorting] = useState<SortingState>(options?.initialState?.sorting ?? [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const query = options?.query
  const queryOptions = query?.({ ...pagination, sorting })
  const page = useQuery({
    ...queryOptions,
    placeholderData: keepPreviousData,
    queryFn: queryOptions?.queryFn ?? skipToken,
    queryKey: queryOptions?.queryKey ?? ["data-table"],
    throwOnError: true,
  })
  const isLoading = query !== undefined && (page.isPending || page.isPlaceholderData)

  const selectable = options?.selectable === true
  const tableColumns = useSelectableColumns(columns, selectable)

  const table = useTable({
    columns: tableColumns,
    data: page.data?.rows ?? data,
    enableRowSelection: selectable,
    features,
    getRowId: (row) => row.id,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater: Updater<SortingState>) => {
      setSorting(updater)
      setPagination(keepFirstPage)
    },
    state: { columnFilters, pagination, rowSelection, sorting },
    ...(query ? { autoResetPageIndex: false, manualPagination: true, manualSorting: true, rowCount: page.data?.total ?? 0 } : {}),
  })

  const headers = table.getFlatHeaders()
  const { rows } = table.getRowModel()

  return (
    <>
      {filters && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {filters.map((filter) => (
            <DataTableFilterControl
              filter={filter}
              key={filter.columnId}
              onChange={(value) => {
                table.getColumn(filter.columnId)?.setFilterValue(value)
              }}
            />
          ))}
        </div>
      )}

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => {
                const direction = header.column.getIsSorted()
                const sorted = direction === false ? "none" : direction
                const SortIcon = SORT_ICONS[sorted]

                return (
                  <TableHead aria-sort={header.column.getCanSort() ? ARIA_SORT[sorted] : undefined} key={header.id}>
                    {!header.column.getCanSort() && <table.FlexRender header={header} />}
                    {header.column.getCanSort() && (
                      <button
                        className="flex cursor-pointer items-center gap-1.5 text-left uppercase transition-colors duration-200 ease-exp hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        <table.FlexRender header={header} />
                        <SortIcon
                          aria-hidden
                          className="size-3.5 shrink-0 text-muted-foreground/60 data-[sorted=true]:text-ring"
                          data-sorted={sorted !== "none"}
                        />
                      </button>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              SKELETON_ROWS.map((row) => (
                <TableRow key={row}>
                  {headers.map((header) => (
                    <TableCell key={header.id}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell className="h-24 text-center text-muted-foreground" colSpan={headers.length}>
                  {t("empty")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              rows.map((row) => (
                <TableRow data-state={row.getIsSelected() ? "selected" : undefined} key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <DataTablePagination isLoading={isLoading} selectedCount={Object.keys(rowSelection).length} table={table} />
    </>
  )
}
