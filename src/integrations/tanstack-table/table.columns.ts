import type { CSSProperties } from "react"

import type { Column, ColumnDef, ColumnPinningState, ColumnVisibilityState, RowData, Table } from "@tanstack/react-table"

import { DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

export const SELECT_COLUMN_ID = "select"

export const ACTIONS_COLUMN_ID = "actions"

export const isDataColumn = (id: string): boolean => id !== SELECT_COLUMN_ID && id !== ACTIONS_COLUMN_ID

const NESTED_KEY_SEPARATOR = "."

const NESTED_ID_SEPARATOR = "_"

export const columnIdOf = <TData extends RowData>(column: ColumnDef<DataGridFeatures, TData>): string => {
  if (column.id === undefined && "accessorKey" in column) {
    return String(column.accessorKey).replaceAll(NESTED_KEY_SEPARATOR, NESTED_ID_SEPARATOR)
  }

  return String(column.id ?? column.header)
}

export const columnLabel = <TData extends RowData>(column: Column<DataGridFeatures, TData>): string => {
  const { header } = column.columnDef

  return typeof header === "string" ? header : column.id
}

export const defaultVisibility = <TData extends RowData>(columns: readonly ColumnDef<DataGridFeatures, TData>[]): ColumnVisibilityState =>
  Object.fromEntries(columns.filter((column) => column.meta?.hidden === true).map((column) => [columnIdOf(column), false]))

export const defaultPinning = <TData extends RowData>(columns: readonly ColumnDef<DataGridFeatures, TData>[]): ColumnPinningState => ({
  [DATA_GRID_PIN.END]: columns.filter((column) => column.meta?.pinned === DATA_GRID_PIN.END).map((column) => columnIdOf(column)),
  [DATA_GRID_PIN.START]: columns.filter((column) => column.meta?.pinned === DATA_GRID_PIN.START).map((column) => columnIdOf(column)),
})

export interface FixedColumns {
  readonly actions: boolean
  readonly selectable: boolean
}

export const NO_FIXED_COLUMNS: FixedColumns = { actions: false, selectable: false }

export const withFixedColumnsPinned = (pinning: ColumnPinningState, { actions, selectable }: FixedColumns): ColumnPinningState => {
  const start = pinning.start.filter((id) => isDataColumn(id))
  const end = pinning.end.filter((id) => isDataColumn(id))

  return { end: actions ? [...end, ACTIONS_COLUMN_ID] : end, start: selectable ? [SELECT_COLUMN_ID, ...start] : start }
}

export const pinnedStyle = <TData extends RowData>(column: Column<DataGridFeatures, TData>): CSSProperties => {
  const pinned = column.getIsPinned()

  if (pinned === DATA_GRID_PIN.START) {
    return { insetInlineStart: column.getStart(DATA_GRID_PIN.START) }
  }

  if (pinned === DATA_GRID_PIN.END) {
    return { insetInlineEnd: column.getAfter(DATA_GRID_PIN.END) }
  }

  return {}
}

export const moveColumn = (order: readonly string[], columnId: string, targetId: string): string[] => {
  const rest = order.filter((id) => id !== columnId)
  const target = rest.indexOf(targetId)
  const from = order.indexOf(columnId)
  const offset = from <= target ? 1 : 0

  return [...rest.slice(0, target + offset), columnId, ...rest.slice(target + offset)]
}

export const COLUMN_MOVE = {
  AFTER: "movedAfter",
  BEFORE: "movedBefore",
} as const

export type ColumnMove = (typeof COLUMN_MOVE)[keyof typeof COLUMN_MOVE]

const directionOf = (ids: readonly string[], columnId: string, targetId: string): ColumnMove =>
  ids.indexOf(columnId) < ids.indexOf(targetId) ? COLUMN_MOVE.AFTER : COLUMN_MOVE.BEFORE

export const reorderColumn = <TData extends RowData>(
  table: Table<DataGridFeatures, TData>,
  column: Column<DataGridFeatures, TData>,
  target: Column<DataGridFeatures, TData>,
): ColumnMove => {
  const pinned = column.getIsPinned()

  if (pinned === false) {
    const order = table.getAllLeafColumns().map(({ id }) => id)
    table.setColumnOrder(moveColumn(order, column.id, target.id))
    return directionOf(order, column.id, target.id)
  }

  const pinning = table.atoms.columnPinning.get()
  table.setColumnPinning({ ...pinning, [pinned]: moveColumn(pinning[pinned], column.id, target.id) })
  return directionOf(pinning[pinned], column.id, target.id)
}

export const exportValueOf = <TData extends RowData>(column: Column<DataGridFeatures, TData>, row: TData, value: unknown): string => {
  const exported = column.columnDef.meta?.export

  if (exported !== undefined) {
    return exported(row)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return typeof value === "string" || typeof value === "number" ? String(value) : ""
}
