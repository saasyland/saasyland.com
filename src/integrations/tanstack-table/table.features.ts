import {
  type CellData,
  type RowData,
  type TableFeatures,
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  constructFilterFn,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrHas,
  filterFn_equalsString,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table"
import type zod from "zod/v4"

import type { dateRangeField, numberRangeField } from "~/src/modules/_core/utils/zod-fields"

export type DataGridNumberRange = zod.infer<typeof numberRangeField>

export type DataGridDateRange = zod.infer<typeof dateRangeField>

export const isNumberInRange = (
  value: unknown,
  { max = Number.POSITIVE_INFINITY, min = Number.NEGATIVE_INFINITY }: DataGridNumberRange,
): boolean => typeof value === "number" && value >= min && value <= max

export const isDateInRange = (
  value: unknown,
  { from = Number.NEGATIVE_INFINITY, to = Number.POSITIVE_INFINITY }: DataGridDateRange,
): boolean => value instanceof Date && value.getTime() >= from && value.getTime() <= to

const filterFn_numberInRange = constructFilterFn({
  autoRemove: (range: DataGridNumberRange) => range.min === undefined && range.max === undefined,
  filter: isNumberInRange,
})

const filterFn_dateInRange = constructFilterFn({
  autoRemove: (range: DataGridDateRange) => range.from === undefined && range.to === undefined,
  filter: isDateInRange,
})

export const dataGridFeatures = tableFeatures({
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  filterFns: {
    arrHas: filterFn_arrHas,
    dateInRange: filterFn_dateInRange,
    equalsString: filterFn_equalsString,
    includesString: filterFn_includesString,
    numberInRange: filterFn_numberInRange,
  },
  filteredRowModel: createFilteredRowModel(),
  globalFilteringFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text },
  sortedRowModel: createSortedRowModel(),
})

export type DataGridFeatures = typeof dataGridFeatures

export const DATA_GRID_FILTER = {
  DATE_RANGE: "dateRange",
  MULTI_SELECT: "multiSelect",
  NUMBER_RANGE: "numberRange",
  SELECT: "select",
  TEXT: "text",
} as const

export type DataGridFilterKind = (typeof DATA_GRID_FILTER)[keyof typeof DATA_GRID_FILTER]

export const DATA_GRID_FILTER_FNS = {
  [DATA_GRID_FILTER.DATE_RANGE]: "dateInRange",
  [DATA_GRID_FILTER.MULTI_SELECT]: "arrHas",
  [DATA_GRID_FILTER.NUMBER_RANGE]: "numberInRange",
  [DATA_GRID_FILTER.SELECT]: "equalsString",
  [DATA_GRID_FILTER.TEXT]: "includesString",
} as const satisfies Record<DataGridFilterKind, keyof typeof dataGridFeatures.filterFns>

export interface DataGridOption {
  readonly label: string
  readonly value: string
}

export type DataGridFilter =
  | { readonly kind: typeof DATA_GRID_FILTER.DATE_RANGE }
  | { readonly kind: typeof DATA_GRID_FILTER.MULTI_SELECT; readonly options: readonly DataGridOption[] }
  | { readonly kind: typeof DATA_GRID_FILTER.NUMBER_RANGE }
  | { readonly kind: typeof DATA_GRID_FILTER.SELECT; readonly options: readonly DataGridOption[] }
  | { readonly kind: typeof DATA_GRID_FILTER.TEXT }

export const DATA_GRID_TYPING_DELAY_MS = 300

export const DATA_GRID_DENSITY = {
  COMFORTABLE: "comfortable",
  COMPACT: "compact",
} as const

export const DATA_GRID_DENSITIES = [DATA_GRID_DENSITY.COMFORTABLE, DATA_GRID_DENSITY.COMPACT] as const

export type DataGridDensity = (typeof DATA_GRID_DENSITIES)[number]

export const DATA_GRID_PIN = {
  END: "end",
  START: "start",
} as const

export type DataGridPin = (typeof DATA_GRID_PIN)[keyof typeof DATA_GRID_PIN]

declare module "@tanstack/react-table" {
  interface ColumnMeta<in out TFeatures extends TableFeatures, in out TData extends RowData, TValue extends CellData = CellData> {
    readonly export?: (row: TData) => string
    readonly filter?: DataGridFilter
    readonly hidden?: boolean
    readonly pinned?: DataGridPin
  }
}
