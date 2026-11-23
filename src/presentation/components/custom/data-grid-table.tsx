import { type DragEvent, type JSX, type KeyboardEvent, useState } from "react"

import type { Column, Header, Row } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox, SearchX } from "lucide-react"
import { Button as ButtonPrimitive } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import {
  ACTIONS_COLUMN_ID,
  SELECT_COLUMN_ID,
  columnLabel,
  isDataColumn,
  pinnedStyle,
  reorderColumn,
} from "~/src/integrations/tanstack-table/table.columns"
import {
  DATA_GRID_ALIGN,
  DATA_GRID_PIN,
  type DataGridDensity,
  type DataGridFeatures,
} from "~/src/integrations/tanstack-table/table.features"

import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/src/presentation/components/shadcn/empty"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import type { DataGridRow, DataGridTableInstance } from "~/src/presentation/components/custom/data-grid"
import { DataGridColumnMenu } from "~/src/presentation/components/custom/data-grid-column-menu"

const COLUMN_DRAG_TYPE = "application/x-data-grid-column"

const HEADER_ROW_INDEX = 1

const FIRST_BODY_ROW_INDEX = 2

const RESIZE_STEP_PX = 16

const SKELETON_ROWS = Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => index)

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown } as const

const RESIZE_KEYS: Readonly<Record<string, number>> = { ArrowLeft: -RESIZE_STEP_PX, ArrowRight: RESIZE_STEP_PX }

const pinnedClasses = <TData extends DataGridRow>(column: Column<DataGridFeatures, TData>): string => {
  const pinned = column.getIsPinned()

  const isEndEdge = pinned === DATA_GRID_PIN.END && column.getIsFirstColumn(DATA_GRID_PIN.END)
  const isStartEdge = pinned === DATA_GRID_PIN.START && column.getIsLastColumn(DATA_GRID_PIN.START)

  return cn({
    "grid-end-edge border-l border-l-border": isEndEdge,
    "grid-start-edge border-r border-r-border": isStartEdge,
    sticky: pinned !== false,
  })
}

const SortIndicator = <TData extends DataGridRow>({
  column,
  sorts,
}: {
  readonly column: Column<DataGridFeatures, TData>
  readonly sorts: number
}): JSX.Element => {
  const sorted = column.getIsSorted()

  if (sorted === false) {
    return <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground/60" />
  }

  const Icon = SORT_ICONS[sorted]

  return (
    <span className="flex shrink-0 items-center gap-0.5 text-ring">
      <Icon aria-hidden className="size-3.5" />
      {sorts > 1 && (
        <span aria-hidden className="text-label tabular-nums">
          {column.getSortIndex() + 1}
        </span>
      )}
    </span>
  )
}

const ColumnResizer = <TData extends DataGridRow>({
  header,
  label,
  table,
}: {
  readonly header: Header<DataGridFeatures, TData>
  readonly label: string
  readonly table: DataGridTableInstance<TData>
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.column")
  const { column } = header
  const resize = header.getResizeHandler()

  return (
    <div
      aria-label={t("resize", { column: label })}
      aria-orientation="vertical"
      aria-valuemax={column.columnDef.maxSize}
      aria-valuemin={column.columnDef.minSize}
      aria-valuenow={column.getSize()}
      className={cn(
        "absolute inset-y-0 -right-1 z-10 flex w-2 cursor-col-resize touch-none justify-center outline-none select-none after:h-full after:w-px after:bg-transparent after:transition-colors hover:after:bg-ring focus-visible:after:w-0.5 focus-visible:after:bg-ring",
        { "after:w-0.5 after:bg-ring": column.getIsResizing() },
      )}
      draggable={false}
      onDoubleClick={() => {
        column.resetSize()
      }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        const step = RESIZE_KEYS[event.key]
        if (step === undefined) {
          return
        }
        event.preventDefault()
        table.setColumnSizing((sizing) => ({ ...sizing, [column.id]: column.getSize() + step }))
      }}
      onMouseDown={(event) => {
        event.preventDefault()
        resize(event)
      }}
      onTouchStart={(event) => {
        resize(event)
      }}
      role="separator"
      tabIndex={0}
    />
  )
}

interface ColumnDragging {
  readonly dragged: string | undefined
  readonly setDragged: (columnId: string | undefined) => void
}

const DataGridHead = <TData extends DataGridRow>({
  announce,
  dragging,
  header,
  table,
}: {
  readonly announce: (message: string) => void
  readonly dragging: ColumnDragging
  readonly header: Header<DataGridFeatures, TData>
  readonly table: DataGridTableInstance<TData>
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.column")
  const [isDropTarget, setDropTarget] = useState(false)
  const { column } = header
  const label = columnLabel(column)
  const sorted = column.getIsSorted()
  const isMovable = isDataColumn(column.id)
  const isEnd = column.columnDef.meta?.align === DATA_GRID_ALIGN.END
  const draggedColumn = dragging.dragged === undefined ? undefined : table.getColumn(dragging.dragged)
  const accepts =
    isMovable && draggedColumn !== undefined && draggedColumn.id !== column.id && draggedColumn.getIsPinned() === column.getIsPinned()

  return (
    <TableHead
      aria-sort={column.getCanSort() && sorted !== false ? ARIA_SORT[sorted] : undefined}
      className={cn(
        "group/head sticky top-0 z-20 h-10 border-b border-b-border/70 bg-(--grid-head) py-1.5 text-spec leading-snug font-medium tracking-normal whitespace-normal normal-case transition-colors duration-150",
        pinnedClasses(column),
        {
          "bg-muted": isDropTarget,
          "opacity-50": dragging.dragged === column.id,
          "text-foreground": sorted !== false,
          "text-right": isEnd,
          "z-30": column.getIsPinned() !== false,
        },
      )}
      draggable={isMovable}
      onDragEnd={() => {
        dragging.setDragged(undefined)
      }}
      onDragLeave={() => {
        setDropTarget(false)
      }}
      onDragOver={(event: DragEvent<HTMLTableCellElement>) => {
        if (accepts) {
          event.preventDefault()
          setDropTarget(true)
        }
      }}
      onDragStart={(event: DragEvent<HTMLTableCellElement>) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData(COLUMN_DRAG_TYPE, column.id)
        dragging.setDragged(column.id)
      }}
      onDrop={(event: DragEvent<HTMLTableCellElement>) => {
        event.preventDefault()
        setDropTarget(false)
        dragging.setDragged(undefined)
        if (draggedColumn === undefined) {
          return
        }
        announce(t(reorderColumn(table, draggedColumn, column), { column: columnLabel(draggedColumn), target: label }))
      }}
      style={pinnedStyle(column)}
    >
      <div className={cn("flex min-w-0 items-center gap-1", { "flex-row-reverse": isEnd })}>
        {column.getCanSort() && (
          <ButtonPrimitive
            className={cn(
              "-mx-1 flex min-w-0 cursor-pointer items-center gap-1.5 rounded-sm px-1 py-0.5 text-left transition-colors duration-200 ease-exp outline-none hover:text-foreground data-focus-visible:ring-2 data-focus-visible:ring-ring/50",
              { "flex-row-reverse text-right": isEnd },
            )}
            onPress={(event) => {
              column.toggleSorting(undefined, event.shiftKey)
            }}
          >
            <span className="line-clamp-2 break-words">
              <table.FlexRender header={header} />
            </span>
            <SortIndicator column={column} sorts={table.state.sorting.length} />
          </ButtonPrimitive>
        )}
        {!column.getCanSort() && typeof column.columnDef.header === "string" && <span className="line-clamp-2 break-words">{label}</span>}
        {!column.getCanSort() && typeof column.columnDef.header !== "string" && <table.FlexRender header={header} />}
        {isMovable && <DataGridColumnMenu announce={announce} column={column} table={table} />}
      </div>
      {column.getCanResize() && <ColumnResizer header={header} label={label} table={table} />}
    </TableHead>
  )
}

const DataGridBodyRow = <TData extends DataGridRow>({
  index,
  row,
  table,
}: {
  readonly index: number
  readonly row: Row<DataGridFeatures, TData>
  readonly table: DataGridTableInstance<TData>
}): JSX.Element => (
  <TableRow aria-rowindex={index} className="group/row" data-state={row.getIsSelected() ? "selected" : undefined}>
    {row.getVisibleCells().map((cell) => (
      <TableCell
        className={cn(
          "truncate border-b border-b-border/70 text-sm group-last/row:border-b-0 group-data-[density=compact]/grid:py-1.5",
          pinnedClasses(cell.column),
          {
            "text-right tabular-nums": cell.column.columnDef.meta?.align === DATA_GRID_ALIGN.END,
            "z-10 bg-card group-hover/row:bg-[color-mix(in_oklab,var(--muted)_45%,var(--card))] group-data-[state=selected]/row:bg-muted":
              cell.column.getIsPinned() !== false,
          },
        )}
        key={cell.id}
        style={pinnedStyle(cell.column)}
      >
        <table.FlexRender cell={cell} />
      </TableCell>
    ))}
  </TableRow>
)

const SkeletonRows = <TData extends DataGridRow>({
  columns,
}: {
  readonly columns: readonly Column<DataGridFeatures, TData>[]
}): JSX.Element[] =>
  SKELETON_ROWS.map((row) => (
    <TableRow className="hover:bg-transparent" key={row}>
      {columns.map((column) => (
        <TableCell
          className={cn("border-b border-b-border/70 group-data-[density=compact]/grid:py-1.5", pinnedClasses(column), {
            "z-10 bg-card": column.getIsPinned() !== false,
          })}
          key={column.id}
          style={pinnedStyle(column)}
        >
          <Skeleton
            className={cn("h-lh scale-y-70", {
              "ml-auto size-7 scale-y-100 rounded-md": column.id === ACTIONS_COLUMN_ID,
              "size-4 scale-y-100 rounded-sm": column.id === SELECT_COLUMN_ID,
              "w-3/4": isDataColumn(column.id),
            })}
          />
        </TableCell>
      ))}
    </TableRow>
  ))

const DataGridEmpty = ({
  empty,
  isFiltered,
  onClear,
}: {
  readonly empty: string | undefined
  readonly isFiltered: boolean
  readonly onClear: () => void
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.empty")

  if (!isFiltered) {
    return (
      <Empty className="sticky left-0 py-14" role="status">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{empty ?? t("title")}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Empty className="sticky left-0 py-14" role="status">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{t("filteredTitle")}</EmptyTitle>
        <EmptyDescription>{t("filteredDescription")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onPress={onClear} size="sm" variant="outline">
          {t("clear")}
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export interface DataGridTableProps<TData extends DataGridRow> {
  readonly announce: (message: string) => void
  readonly density: DataGridDensity
  readonly empty: string | undefined
  readonly isFiltered: boolean
  readonly isLoading: boolean
  readonly isRefreshing: boolean
  readonly label: string
  readonly onClear: () => void
  readonly table: DataGridTableInstance<TData>
}

export const DataGridTable = <TData extends DataGridRow>({
  announce,
  density,
  empty,
  isFiltered,
  isLoading,
  isRefreshing,
  label,
  onClear,
  table,
}: DataGridTableProps<TData>): JSX.Element => {
  const [dragged, setDragged] = useState<string>()
  const columns = table.getVisibleLeafColumns()
  const { rows } = table.getRowModel()
  const { pageIndex, pageSize } = table.state.pagination
  const stretched = columns.findLast((column) => isDataColumn(column.id))

  return (
    <TableContainer
      className="group/grid grid-scroller max-h-[max(24rem,calc(100dvh-16rem))] overflow-auto overscroll-x-contain"
      data-density={density}
    >
      <Table
        aria-busy={isLoading || isRefreshing}
        aria-label={label}
        aria-rowcount={table.getRowCount() + HEADER_ROW_INDEX}
        className="table-fixed border-separate border-spacing-0"
        style={{ width: `max(100%, ${String(table.getTotalSize())}px)` }}
      >
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={column === stretched ? undefined : { width: column.getSize() }} />
          ))}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow aria-rowindex={HEADER_ROW_INDEX} className="hover:bg-transparent" key={group.id}>
              {group.headers.map((header) => (
                <DataGridHead announce={announce} dragging={{ dragged, setDragged }} header={header} key={header.id} table={table} />
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={cn("transition-opacity duration-200", { "opacity-60": isRefreshing })}>
          {isLoading && <SkeletonRows columns={columns} />}
          {!isLoading &&
            rows.map((row, index) => (
              <DataGridBodyRow index={pageIndex * pageSize + index + FIRST_BODY_ROW_INDEX} key={row.id} row={row} table={table} />
            ))}
        </TableBody>
      </Table>
      {!isLoading && rows.length === 0 && <DataGridEmpty empty={empty} isFiltered={isFiltered} onClear={onClear} />}
    </TableContainer>
  )
}
