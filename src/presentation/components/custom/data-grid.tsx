import { type JSX, type ReactNode, useMemo, useState } from "react"

import { type QueryClient, type UseQueryOptions, keepPreviousData, skipToken, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type CellContext,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type HeaderContext,
  type PaginationState,
  type ReactTable,
  type RowSelectionState,
  type SortingState,
  type Updater,
  createColumnHelper,
  functionalUpdate,
  useTable,
} from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { SELECT_COLUMN_ID, defaultPinning, defaultVisibility, withSelectPinned } from "~/src/integrations/tanstack-table/table.columns"
import {
  DATA_GRID_DENSITY,
  DATA_GRID_FILTER_FNS,
  DATA_GRID_TYPING_DELAY_MS,
  type DataGridDensity,
  type DataGridFeatures,
  dataGridFeatures,
} from "~/src/integrations/tanstack-table/table.features"

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_SORTED_COLUMNS, PAGE_SIZES, type PageSize } from "~/src/modules/_core/utils/pagination"

import { useDataGridPreferences } from "~/src/hooks/use-data-grid-preferences"
import { useDebouncedCallback } from "~/src/hooks/use-debounced-callback"

import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"

import { DataGridPagination } from "~/src/presentation/components/custom/data-grid-pagination"
import { DataGridTable } from "~/src/presentation/components/custom/data-grid-table"
import { DataGridSelection, DataGridToolbar } from "~/src/presentation/components/custom/data-grid-toolbar"

export interface DataGridRow {
  readonly id: string
}

export type DataGridColumn<TData extends DataGridRow> = ColumnDef<DataGridFeatures, TData>

export interface DataGridPage<TData> {
  readonly rows: TData[]
  readonly total: number
}

export interface DataGridRequest {
  readonly filters: Readonly<Record<string, unknown>>
  readonly pageIndex: number
  readonly pageSize: number
  readonly search: string
  readonly sorting: SortingState
}

export type DataGridQuery<TData extends DataGridRow> = (
  request: DataGridRequest,
) => Pick<UseQueryOptions<DataGridPage<TData>>, "queryFn" | "queryKey">

export interface DataGridProps<TData extends DataGridRow> {
  readonly bulkActions?: (rows: readonly TData[]) => ReactNode
  readonly columns: readonly DataGridColumn<TData>[]
  readonly data?: readonly TData[]
  readonly empty?: string
  readonly id: string
  readonly label: string
  readonly query?: DataGridQuery<TData>
  readonly search?: string
  readonly selectable?: boolean
}

interface QueryState {
  readonly columnFilters: ColumnFiltersState
  readonly globalFilter: string
  readonly pageIndex: number
  readonly rowSelection: RowSelectionState
  readonly sorting: SortingState
}

const FRESH_QUERY: QueryState = { columnFilters: [], globalFilter: "", pageIndex: 0, rowSelection: {}, sorting: [] }

const FIRST_PAGE = { pageIndex: 0, rowSelection: {} }

const NO_ROWS: never[] = []

const NO_ORDER: ColumnOrderState = []

const NO_SIZING: ColumnSizingState = {}

const CLIENT_QUERY_KEY = ["data-grid"]

const SELECT_COLUMN_SIZE = 44

const DEFAULT_COLUMN = { maxSize: 640, minSize: 96, size: 176 }

const SelectAllHeader = <TData extends DataGridRow>({ table }: HeaderContext<DataGridFeatures, TData>): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.selection")

  return (
    <Checkbox
      aria-label={t("selectPage")}
      isIndeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
      isSelected={table.getIsAllPageRowsSelected()}
      onChange={(selected) => {
        table.toggleAllPageRowsSelected(selected)
      }}
    />
  )
}

const SelectRowCell = <TData extends DataGridRow>({ row }: CellContext<DataGridFeatures, TData>): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.selection")

  return (
    <Checkbox
      aria-label={t("selectRow")}
      isDisabled={!row.getCanSelect()}
      isSelected={row.getIsSelected()}
      onChange={(selected) => {
        row.toggleSelected(selected)
      }}
    />
  )
}

const selectColumn = <TData extends DataGridRow>(): DataGridColumn<TData> =>
  createColumnHelper<DataGridFeatures, TData>().display({
    cell: SelectRowCell,
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    enableSorting: false,
    header: SelectAllHeader,
    id: SELECT_COLUMN_ID,
    maxSize: SELECT_COLUMN_SIZE,
    minSize: SELECT_COLUMN_SIZE,
    size: SELECT_COLUMN_SIZE,
  })

const useGridColumns = <TData extends DataGridRow>(
  columns: readonly DataGridColumn<TData>[],
  selectable: boolean,
): DataGridColumn<TData>[] =>
  useMemo(() => {
    const filterable = columns.map((column): DataGridColumn<TData> => {
      const kind = column.meta?.filter?.kind

      return kind === undefined ? column : { ...column, filterFn: DATA_GRID_FILTER_FNS[kind] }
    })

    return selectable ? [selectColumn<TData>(), ...filterable] : filterable
  }, [columns, selectable])

const useGridLayout = <TData extends DataGridRow>(id: string, columns: readonly DataGridColumn<TData>[], selectable: boolean) => {
  const { preferences, reset, update } = useDataGridPreferences(id)
  const defaults = useMemo(() => ({ columnPinning: defaultPinning(columns), columnVisibility: defaultVisibility(columns) }), [columns])
  const columnPinning = useMemo(
    () => withSelectPinned(preferences.columnPinning ?? defaults.columnPinning, selectable),
    [defaults, preferences.columnPinning, selectable],
  )
  const columnVisibility = useMemo(
    () => ({ ...defaults.columnVisibility, ...preferences.columnVisibility }),
    [defaults, preferences.columnVisibility],
  )
  const columnOrder = preferences.columnOrder ?? NO_ORDER
  const columnSizing = preferences.columnSizing ?? NO_SIZING

  return {
    density: preferences.density ?? DATA_GRID_DENSITY.COMFORTABLE,
    isChanged: Object.keys(preferences).length > 0,
    onColumnOrderChange: (updater: Updater<ColumnOrderState>) => {
      update({ columnOrder: functionalUpdate(updater, columnOrder) })
    },
    onColumnPinningChange: (updater: Updater<ColumnPinningState>) => {
      update({ columnPinning: withSelectPinned(functionalUpdate(updater, columnPinning), false) })
    },
    onColumnSizingChange: (updater: Updater<ColumnSizingState>) => {
      update({ columnSizing: functionalUpdate(updater, columnSizing) })
    },
    onColumnVisibilityChange: (updater: Updater<ColumnVisibilityState>) => {
      update({ columnVisibility: functionalUpdate(updater, columnVisibility) })
    },
    pageSize: preferences.pageSize ?? DEFAULT_PAGE_SIZE,
    reset,
    setDensity: (density: DataGridDensity) => {
      update({ density })
    },
    setPageSize: (pageSize: PageSize) => {
      update({ pageSize })
    },
    state: { columnOrder, columnPinning, columnSizing, columnVisibility },
  }
}

const requestOf = ({ columnFilters, globalFilter, pageIndex, sorting }: QueryState, pageSize: number): DataGridRequest => ({
  filters: Object.fromEntries(columnFilters.map(({ id, value }) => [id, value])),
  pageIndex,
  pageSize,
  search: globalFilter,
  sorting,
})

const useGridPage = <TData extends DataGridRow>(
  query: DataGridQuery<TData> | undefined,
  request: DataGridRequest,
  data: readonly TData[],
) => {
  const options = query?.(request)
  const page = useQuery({
    ...options,
    placeholderData: keepPreviousData,
    queryFn: options?.queryFn ?? skipToken,
    queryKey: options?.queryKey ?? CLIENT_QUERY_KEY,
    throwOnError: true,
  })

  return {
    isLoading: query !== undefined && page.isPending,
    isRefreshing: page.isPlaceholderData,
    rows: page.data?.rows ?? data,
    total: page.data?.total,
  }
}

interface PagesRequest<TData extends DataGridRow> {
  readonly collected: readonly TData[]
  readonly query: DataGridQuery<TData>
  readonly request: DataGridRequest
}

const fetchEveryPage = async <TData extends DataGridRow>(
  queryClient: QueryClient,
  { collected, query, request }: PagesRequest<TData>,
): Promise<readonly TData[]> => {
  const page = await queryClient.query({ ...query({ ...request, pageSize: MAX_PAGE_SIZE }) })
  const rows = [...collected, ...page.rows]

  if (rows.length >= page.total || page.rows.length === 0) {
    return rows
  }

  return fetchEveryPage(queryClient, { collected: rows, query, request: { ...request, pageIndex: request.pageIndex + 1 } })
}

const useGridState = (pageSize: number, setPageSize: (pageSize: PageSize) => void) => {
  const [state, setState] = useState<QueryState>(FRESH_QUERY)
  const [search, setSearch] = useState("")
  const searching = useDebouncedCallback((text: string) => {
    setState((previous) => ({ ...previous, ...FIRST_PAGE, globalFilter: text.trim() }))
  }, DATA_GRID_TYPING_DELAY_MS)
  const pagination: PaginationState = { pageIndex: state.pageIndex, pageSize }

  return {
    clear: () => {
      searching.cancel()
      setSearch("")
      setState((previous) => ({ ...previous, ...FIRST_PAGE, columnFilters: [], globalFilter: "" }))
    },
    onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
      setState((previous) => ({ ...previous, ...FIRST_PAGE, columnFilters: functionalUpdate(updater, previous.columnFilters) }))
    },
    onPaginationChange: (updater: Updater<PaginationState>) => {
      const next = functionalUpdate(updater, pagination)
      const size = PAGE_SIZES.find((option) => option === next.pageSize)
      if (size !== undefined && size !== pageSize) {
        setPageSize(size)
        setState((previous) => ({ ...previous, ...FIRST_PAGE }))
        return
      }
      setState((previous) => ({ ...previous, pageIndex: next.pageIndex, rowSelection: {} }))
    },
    onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
      setState((previous) => ({ ...previous, rowSelection: functionalUpdate(updater, previous.rowSelection) }))
    },
    onSearch: (text: string) => {
      setSearch(text)
      searching.schedule(text)
    },
    onSortingChange: (updater: Updater<SortingState>) => {
      setState((previous) => ({ ...previous, ...FIRST_PAGE, sorting: functionalUpdate(updater, previous.sorting) }))
    },
    pagination,
    search,
    state,
  }
}

const useDataGrid = <TData extends DataGridRow>({ columns, data = NO_ROWS, id, query, selectable = false }: DataGridProps<TData>) => {
  const queryClient = useQueryClient()
  const layout = useGridLayout(id, columns, selectable)
  const grid = useGridState(layout.pageSize, layout.setPageSize)
  const request = requestOf(grid.state, layout.pageSize)
  const page = useGridPage(query, request, data)
  const isServer = query !== undefined
  const tableColumns = useGridColumns(columns, selectable)
  const table = useTable({
    autoResetPageIndex: false,
    columnResizeMode: "onChange",
    columns: tableColumns,
    data: page.rows,
    defaultColumn: DEFAULT_COLUMN,
    enableMultiSort: true,
    enableRowSelection: selectable,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
    globalFilterFn: "includesString",
    manualFiltering: isServer,
    manualPagination: isServer,
    manualSorting: isServer,
    maxMultiSortColCount: MAX_SORTED_COLUMNS,
    onColumnFiltersChange: grid.onColumnFiltersChange,
    onColumnOrderChange: layout.onColumnOrderChange,
    onColumnPinningChange: layout.onColumnPinningChange,
    onColumnSizingChange: layout.onColumnSizingChange,
    onColumnVisibilityChange: layout.onColumnVisibilityChange,
    onPaginationChange: grid.onPaginationChange,
    onRowSelectionChange: grid.onRowSelectionChange,
    onSortingChange: grid.onSortingChange,
    ...(isServer && { rowCount: page.total ?? 0 }),
    state: { ...layout.state, ...grid.state, pagination: grid.pagination },
  })

  return {
    collectRows: (): Promise<readonly TData[]> => {
      if (query === undefined) {
        return Promise.resolve(table.getPrePaginatedRowModel().rows.map((row) => row.original))
      }
      return fetchEveryPage(queryClient, { collected: [], query, request: { ...request, pageIndex: 0 } })
    },
    grid,
    layout,
    page,
    table,
  }
}

export type DataGridTableInstance<TData extends DataGridRow> = ReactTable<DataGridFeatures, TData>

export const DataGrid = <TData extends DataGridRow>(props: DataGridProps<TData>): JSX.Element => {
  const { bulkActions, empty, id, label, search } = props
  const [announcement, setAnnouncement] = useState("")
  const { collectRows, grid, layout, page, table } = useDataGrid(props)
  const isFiltered = grid.state.globalFilter.length > 0 || grid.state.columnFilters.length > 0

  return (
    <div className="flex min-w-0 flex-col gap-3" data-slot="data-grid">
      <DataGridToolbar
        announce={setAnnouncement}
        collectRows={collectRows}
        density={layout.density}
        id={id}
        isChanged={layout.isChanged}
        onDensityChange={layout.setDensity}
        onReset={layout.reset}
        onSearch={grid.onSearch}
        search={grid.search}
        searchLabel={search}
        table={table}
      />
      <DataGridSelection bulkActions={bulkActions} id={id} table={table} />
      <DataGridTable
        announce={setAnnouncement}
        density={layout.density}
        empty={empty}
        isFiltered={isFiltered}
        isLoading={page.isLoading}
        isRefreshing={page.isRefreshing}
        label={label}
        onClear={grid.clear}
        table={table}
      />
      <DataGridPagination isRefreshing={page.isRefreshing} table={table} />
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
