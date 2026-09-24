import {
  type ColumnDef,
  type ReactTable,
  type RowData,
  type TableOptions,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table"

interface DataTableMeta {
  classNames?: {
    readonly body?: string
    readonly container?: string
    readonly header?: string
    readonly pagination?: string
    readonly row?: string
    readonly table?: string
  }
  isLoading?: boolean
}

interface DataTableColumnMeta {
  align?: "left" | "right" | "center"
}

export const dataTableFeatures = tableFeatures({
  columnMeta: metaHelper<DataTableColumnMeta>(),
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  sortedRowModel: createSortedRowModel(),
  tableMeta: metaHelper<DataTableMeta>(),
})

export type DataTableFeatures = typeof dataTableFeatures
export type DataTableInstance<TData extends RowData> = ReactTable<DataTableFeatures, TData>
export type DataTableColumnDef<TData extends RowData> = ColumnDef<DataTableFeatures, TData>
export type DataTableOptions<TData extends RowData> = Omit<
  TableOptions<DataTableFeatures, TData>,
  "atoms" | "columns" | "data" | "features" | "onPaginationChange" | "onSortingChange" | "state"
>
