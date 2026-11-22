import type { JSX } from "react"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, EllipsisVertical, EyeOff, PanelLeft, PanelRight, PinOff, X } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { SELECT_COLUMN_ID, columnLabel, reorderColumn } from "~/src/integrations/tanstack-table/table.columns"
import { DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

import type { DataGridRow, DataGridTableInstance } from "~/src/presentation/components/custom/data-grid"

const COLUMN_ACTION = {
  CLEAR_SORT: "clear-sort",
  HIDE: "hide",
  MOVE_END: "move-end",
  MOVE_START: "move-start",
  PIN_END: "pin-end",
  PIN_START: "pin-start",
  SORT_ASCENDING: "sort-ascending",
  SORT_DESCENDING: "sort-descending",
  UNPIN: "unpin",
} as const

const PREVIOUS = -1

const NEXT = 1

const regionOf = <TData extends DataGridRow>(table: DataGridTableInstance<TData>, column: Column<DataGridFeatures, TData>) => {
  const pinned = column.getIsPinned()

  if (pinned === DATA_GRID_PIN.START) {
    return table.getStartVisibleLeafColumns().filter(({ id }) => id !== SELECT_COLUMN_ID)
  }

  if (pinned === DATA_GRID_PIN.END) {
    return table.getEndVisibleLeafColumns()
  }

  return table.getCenterVisibleLeafColumns()
}

interface ColumnMenuProps<TData extends DataGridRow> {
  readonly announce: (message: string) => void
  readonly column: Column<DataGridFeatures, TData>
  readonly table: DataGridTableInstance<TData>
}

const SortItems = <TData extends DataGridRow>({ announce, column }: Omit<ColumnMenuProps<TData>, "table">): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.column")
  const label = columnLabel(column)

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem
          id={COLUMN_ACTION.SORT_ASCENDING}
          onAction={() => {
            column.toggleSorting(false)
            announce(t("sortedAscending", { column: label }))
          }}
          textValue={t("sortAscending")}
        >
          <ArrowUp aria-hidden />
          {t("sortAscending")}
        </DropdownMenuItem>
        <DropdownMenuItem
          id={COLUMN_ACTION.SORT_DESCENDING}
          onAction={() => {
            column.toggleSorting(true)
            announce(t("sortedDescending", { column: label }))
          }}
          textValue={t("sortDescending")}
        >
          <ArrowDown aria-hidden />
          {t("sortDescending")}
        </DropdownMenuItem>
        <DropdownMenuItem
          id={COLUMN_ACTION.CLEAR_SORT}
          isDisabled={column.getIsSorted() === false}
          onAction={() => {
            column.clearSorting()
            announce(t("sortCleared", { column: label }))
          }}
          textValue={t("clearSort")}
        >
          <X aria-hidden />
          {t("clearSort")}
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
    </>
  )
}

const PinItems = <TData extends DataGridRow>({ announce, column }: Omit<ColumnMenuProps<TData>, "table">): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.column")
  const label = columnLabel(column)
  const pinned = column.getIsPinned()

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem
        id={COLUMN_ACTION.PIN_START}
        isDisabled={pinned === DATA_GRID_PIN.START}
        onAction={() => {
          column.pin(DATA_GRID_PIN.START)
          announce(t("pinnedStart", { column: label }))
        }}
        textValue={t("pinStart")}
      >
        <PanelLeft aria-hidden />
        {t("pinStart")}
      </DropdownMenuItem>
      <DropdownMenuItem
        id={COLUMN_ACTION.PIN_END}
        isDisabled={pinned === DATA_GRID_PIN.END}
        onAction={() => {
          column.pin(DATA_GRID_PIN.END)
          announce(t("pinnedEnd", { column: label }))
        }}
        textValue={t("pinEnd")}
      >
        <PanelRight aria-hidden />
        {t("pinEnd")}
      </DropdownMenuItem>
      <DropdownMenuItem
        id={COLUMN_ACTION.UNPIN}
        isDisabled={pinned === false}
        onAction={() => {
          column.pin(false)
          announce(t("unpinned", { column: label }))
        }}
        textValue={t("unpin")}
      >
        <PinOff aria-hidden />
        {t("unpin")}
      </DropdownMenuItem>
    </DropdownMenuGroup>
  )
}

const MoveItems = <TData extends DataGridRow>({ announce, column, table }: ColumnMenuProps<TData>): JSX.Element | undefined => {
  const t = useTranslations("components.custom.data-grid.column")
  const region = regionOf(table, column)
  const position = region.indexOf(column)
  const previous = region[position + PREVIOUS]
  const next = region[position + NEXT]

  if (previous === undefined && next === undefined) {
    return undefined
  }

  const moveOnto = (target: Column<DataGridFeatures, TData>): void => {
    announce(t(reorderColumn(table, column, target), { column: columnLabel(column), target: columnLabel(target) }))
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        {previous !== undefined && (
          <DropdownMenuItem
            id={COLUMN_ACTION.MOVE_START}
            onAction={() => {
              moveOnto(previous)
            }}
            textValue={t("moveStart")}
          >
            <ArrowLeft aria-hidden />
            {t("moveStart")}
          </DropdownMenuItem>
        )}
        {next !== undefined && (
          <DropdownMenuItem
            id={COLUMN_ACTION.MOVE_END}
            onAction={() => {
              moveOnto(next)
            }}
            textValue={t("moveEnd")}
          >
            <ArrowRight aria-hidden />
            {t("moveEnd")}
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
    </>
  )
}

export const DataGridColumnMenu = <TData extends DataGridRow>({ announce, column, table }: ColumnMenuProps<TData>): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.column")
  const label = columnLabel(column)

  return (
    <DropdownMenuTrigger>
      <Button
        aria-label={t("menu", { column: label })}
        className="ml-auto opacity-0 group-hover/head:opacity-100 aria-expanded:opacity-100 data-focus-visible:opacity-100 pointer-coarse:opacity-100"
        size="icon-xs"
        variant="ghost"
      >
        <EllipsisVertical aria-hidden />
      </Button>
      <DropdownMenu className="min-w-48" placement="bottom end">
        {column.getCanSort() && <SortItems announce={announce} column={column} />}
        <PinItems announce={announce} column={column} />
        <MoveItems announce={announce} column={column} table={table} />
        {column.getCanHide() && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id={COLUMN_ACTION.HIDE}
              onAction={() => {
                column.toggleVisibility(false)
                announce(t("hidden", { column: label }))
              }}
              textValue={t("hide")}
            >
              <EyeOff aria-hidden />
              {t("hide")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}
