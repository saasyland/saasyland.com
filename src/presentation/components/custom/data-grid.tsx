import { type ComponentType, type JSX, type ReactNode, useMemo, useState } from "react"

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

import {
  ACTIONS_COLUMN_ID,
  type FixedColumns,
  NO_FIXED_COLUMNS,
  REORDER_COLUMN_ID,
  SELECT_COLUMN_ID,
  defaultPinning,
  defaultVisibility,
  withFixedColumnsPinned,
} from "~/src/integrations/tanstack-table/table.columns"
import {
  DATA_GRID_DENSITY,
  DATA_GRID_FILTER_FNS,
  DATA_GRID_TYPING_DELAY_MS,
  type DataGridDensity,
  type DataGridFeatures,
  dataGridFeatures,
} from "~/src/integrations/tanstack-table/table.features"

import { FIRST_POSITION } from "~/src/modules/_core/constants/ordering"
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_SORTED_COLUMNS, PAGE_SIZES, type PageSize } from "~/src/modules/_core/utils/pagination"

import { useDataGridPreferences } from "~/src/hooks/use-data-grid-preferences"
import { useDebouncedCallback } from "~/src/hooks/use-debounced-callback"

import { DATA_GRID_ACTIONS_SIZE } from "~/src/data/data-grid"

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

export interface DataGridMove<TData> {
  readonly offset: number
  readonly row: TData
}

export interface DataGridProps<TData extends DataGridRow> {
  readonly bulkActions?: (rows: readonly TData[]) => ReactNode
  readonly columns: readonly DataGridColumn<TData>[]
  readonly data?: readonly TData[]
  readonly defaultPageSize?: PageSize
  readonly empty?: string
  readonly emptyDescription?: string
  readonly id: string
  readonly label: string
  readonly onReorder?: (move: DataGridMove<TData>) => Promise<unknown>
  readonly query?: DataGridQuery<TData>
  readonly rowActions?: ComponentType<{ readonly row: TData }>
  readonly search?: string
  readonly selectable?: boolean
}

export interface DataGridRowDrag<TData> {
  readonly dragged: TData | undefined
  readonly focused: string | undefined
  readonly isEnabled: boolean
  readonly onDragEnd: (row: TData, from: number, isDropped: boolean) => void
  readonly onDragOver: (row: TData) => void
  readonly onDragStart: (row: TData) => void
  readonly onFocused: () => void
  readonly onStep: (row: TData, step: number) => void
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

const REORDER_COLUMN_SIZE = 40

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

const ReorderHeader = (): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.rows")

  return <span className="sr-only">{t("header")}</span>
}

const reorderColumn = <TData extends DataGridRow>(): DataGridColumn<TData> =>
  createColumnHelper<DataGridFeatures, TData>().display({
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    enableSorting: false,
    header: ReorderHeader,
    id: REORDER_COLUMN_ID,
    maxSize: REORDER_COLUMN_SIZE,
    minSize: REORDER_COLUMN_SIZE,
    size: REORDER_COLUMN_SIZE,
  })

const ActionsHeader = (): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.actions")

  return <span className="sr-only">{t("header")}</span>
}

const actionsColumn = <TData extends DataGridRow>(RowActions: ComponentType<{ readonly row: TData }>): DataGridColumn<TData> =>
  createColumnHelper<DataGridFeatures, TData>().display({
    cell: ({ row }) => <RowActions row={row.original} />,
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    enableSorting: false,
    header: ActionsHeader,
    id: ACTIONS_COLUMN_ID,
    maxSize: DATA_GRID_ACTIONS_SIZE,
    minSize: DATA_GRID_ACTIONS_SIZE,
    size: DATA_GRID_ACTIONS_SIZE,
  })

const useGridColumns = <TData extends DataGridRow>(
  columns: readonly DataGridColumn<TData>[],
  {
    fixed,
    rowActions,
  }: {
    readonly fixed: FixedColumns
    readonly rowActions: ComponentType<{ readonly row: TData }> | undefined
  },
): DataGridColumn<TData>[] =>
  useMemo(() => {
    const filterable = columns.map((column): DataGridColumn<TData> => {
      const kind = column.meta?.filter?.kind

      return kind === undefined ? column : { ...column, filterFn: DATA_GRID_FILTER_FNS[kind] }
    })

    return [
      ...(fixed.selectable ? [selectColumn<TData>()] : []),
      ...(fixed.reorderable ? [reorderColumn<TData>()] : []),
      ...filterable,
      ...(rowActions === undefined ? [] : [actionsColumn(rowActions)]),
    ]
  }, [columns, fixed, rowActions])

const useGridLayout = <TData extends DataGridRow>(
  id: string,
  columns: readonly DataGridColumn<TData>[],
  { defaultPageSize, fixed }: { readonly defaultPageSize: PageSize; readonly fixed: FixedColumns },
) => {
  const { preferences, reset, update } = useDataGridPreferences(id)
  const defaults = useMemo(() => ({ columnPinning: defaultPinning(columns), columnVisibility: defaultVisibility(columns) }), [columns])
  const columnPinning = useMemo(
    () => withFixedColumnsPinned(preferences.columnPinning ?? defaults.columnPinning, fixed),
    [defaults, fixed, preferences.columnPinning],
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
      update({ columnPinning: withFixedColumnsPinned(functionalUpdate(updater, columnPinning), NO_FIXED_COLUMNS) })
    },
    onColumnSizingChange: (updater: Updater<ColumnSizingState>) => {
      update({ columnSizing: functionalUpdate(updater, columnSizing) })
    },
    onColumnVisibilityChange: (updater: Updater<ColumnVisibilityState>) => {
      update({ columnVisibility: functionalUpdate(updater, columnVisibility) })
    },
    pageSize: preferences.pageSize ?? defaultPageSize,
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

interface RowOrder<TData> {
  readonly pageIndex: number
  readonly rows: readonly TData[]
  readonly source: readonly TData[]
}

const moveRow = <TData extends DataGridRow>(rows: readonly TData[], row: TData, index: number): TData[] => {
  const rest = rows.filter((entry) => entry !== row)

  return [...rest.slice(0, index), row, ...rest.slice(index)]
}

const useRowOrder = <TData extends DataGridRow>(rows: readonly TData[], pageIndex: number) => {
  const [order, setOrder] = useState<RowOrder<TData>>()
  const [moving, setMoving] = useState(0)
  const [dragged, setDragged] = useState<TData>()
  const [focused, setFocused] = useState<string>()
  const isMoved = order !== undefined && (order.source === rows || (moving > 0 && order.pageIndex === pageIndex))

  return {
    dragged,
    focused,
    place: (moved: readonly TData[]) => {
      setOrder({ pageIndex, rows: moved, source: rows })
    },
    rows: isMoved ? order.rows : rows,
    setDragged,
    setFocused,
    setMoving,
    setOrder,
  }
}

const useRowDrag = <TData extends DataGridRow>({
  announce,
  isEnabled,
  isServer,
  onReorder,
  order,
  table,
}: {
  readonly announce: (message: string) => void
  readonly isEnabled: boolean
  readonly isServer: boolean
  readonly onReorder: ((move: DataGridMove<TData>) => Promise<unknown>) | undefined
  readonly order: ReturnType<typeof useRowOrder<TData>>
  readonly table: ReactTable<DataGridFeatures, TData>
}): DataGridRowDrag<TData> => {
  const t = useTranslations("components.custom.data-grid.rows")
  const { pageIndex, pageSize } = table.state.pagination
  const total = table.getRowCount()
  const start = pageIndex * pageSize
  const firstRow = isServer ? 0 : start

  const persist = (row: TData, position: number, offset: number): void => {
    announce(t("moved", { position, total }))
    order.setMoving((count) => count + 1)
    void onReorder?.({ offset, row })
      .catch(() => {
        order.setOrder(undefined)
      })
      .finally(() => {
        order.setMoving((count) => count - 1)
      })
  }

  return {
    dragged: order.dragged,
    focused: order.focused,
    isEnabled,
    onDragEnd: (row, from, isDropped) => {
      order.setDragged(undefined)
      if (!isDropped) {
        order.place(moveRow(order.rows, row, from + firstRow))
        return
      }
      const index = order.rows.indexOf(row) - firstRow
      if (index !== from) {
        persist(row, start + index + FIRST_POSITION, index - from)
      }
    },
    onDragOver: (row) => {
      const { dragged } = order
      if (dragged === undefined || dragged === row) {
        return
      }
      order.place(moveRow(order.rows, dragged, order.rows.indexOf(row)))
    },
    onDragStart: (row) => {
      order.setDragged(row)
    },
    onFocused: () => {
      order.setFocused(undefined)
    },
    onStep: (row, step) => {
      const index = order.rows.indexOf(row) + step
      const position = start + index - firstRow + FIRST_POSITION
      if (position < FIRST_POSITION || position > total) {
        return
      }
      const target = Math.floor((position - FIRST_POSITION) / pageSize)
      order.setFocused(row.id)
      order.place(moveRow(order.rows, row, Math.max(index, 0)))
      if (target !== pageIndex) {
        table.setPageIndex(target)
      }
      persist(row, position, step)
    },
  }
}

const useDataGrid = <TData extends DataGridRow>(
  {
    columns,
    data = NO_ROWS,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    id,
    onReorder,
    query,
    rowActions,
    selectable = false,
  }: DataGridProps<TData>,
  announce: (message: string) => void,
) => {
  const queryClient = useQueryClient()
  const hasActions = rowActions !== undefined
  const reorderable = onReorder !== undefined
  const fixed = useMemo(() => ({ actions: hasActions, reorderable, selectable }), [hasActions, reorderable, selectable])
  const layout = useGridLayout(id, columns, { defaultPageSize, fixed })
  const grid = useGridState(layout.pageSize, layout.setPageSize)
  const request = requestOf(grid.state, layout.pageSize)
  const page = useGridPage(query, request, data)
  const order = useRowOrder(page.rows, grid.state.pageIndex)
  const isServer = query !== undefined
  const isStoredOrder = grid.state.sorting.length === 0 && grid.state.columnFilters.length === 0 && grid.state.globalFilter.length === 0
  const tableColumns = useGridColumns(columns, { fixed, rowActions })
  const table = useTable({
    autoResetPageIndex: false,
    columnResizeMode: "onChange",
    columns: tableColumns,
    data: order.rows,
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
  const drag = useRowDrag({ announce, isEnabled: isStoredOrder, isServer, onReorder, order, table })

  return {
    collectRows: (): Promise<readonly TData[]> => {
      if (query === undefined) {
        return Promise.resolve(table.getPrePaginatedRowModel().rows.map((row) => row.original))
      }
      return fetchEveryPage(queryClient, { collected: [], query, request: { ...request, pageIndex: 0 } })
    },
    drag,
    grid,
    layout,
    page,
    table,
  }
}

export type DataGridTableInstance<TData extends DataGridRow> = ReactTable<DataGridFeatures, TData>

export const DataGrid = <TData extends DataGridRow>(props: DataGridProps<TData>): JSX.Element => {
  const { bulkActions, empty, emptyDescription, id, label, search } = props
  const [announcement, setAnnouncement] = useState("")
  const { collectRows, drag, grid, layout, page, table } = useDataGrid(props, setAnnouncement)
  const isFiltered = grid.state.globalFilter.length > 0 || grid.state.columnFilters.length > 0

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card" data-slot="data-grid">
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
        drag={drag}
        empty={empty}
        emptyDescription={emptyDescription}
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
