import type { JSX, ReactNode } from "react"

import { useMutation } from "@tanstack/react-query"
import { Columns3, Download, RotateCcw, Rows3, Rows4, Search, X } from "lucide-react"
import { SearchField, type Selection } from "react-aria-components"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { columnLabel, exportValueOf, isDataColumn } from "~/src/integrations/tanstack-table/table.columns"
import { DATA_GRID_DENSITIES, DATA_GRID_DENSITY, type DataGridDensity } from "~/src/integrations/tanstack-table/table.features"

import { SEARCH_MAX_LENGTH } from "~/src/modules/_core/utils/pagination"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { CSV_MEDIA_TYPE, csvOf } from "~/src/lib/csv"
import { downloadFile } from "~/src/lib/download"

import { Button, type ButtonVariantProps } from "~/src/presentation/components/shadcn/button"
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "~/src/presentation/components/shadcn/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"
import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

import type { DataGridRow, DataGridTableInstance } from "~/src/presentation/components/custom/data-grid"
import { DataGridFilterChips, DataGridFilterMenu } from "~/src/presentation/components/custom/data-grid-filter"

const ISO_DAY_LENGTH = "YYYY-MM-DD".length

const csvOfRows = <TData extends DataGridRow>(table: DataGridTableInstance<TData>, rows: readonly TData[]): string => {
  const columns = table.getVisibleLeafColumns().filter((column) => isDataColumn(column.id))

  return csvOf([
    columns.map((column) => columnLabel(column)),
    ...rows.map((row, index) => columns.map((column) => exportValueOf(column, row, column.accessorFn?.(row, index)))),
  ])
}

const ExportButton = <TData extends DataGridRow>({
  children,
  id,
  rows,
  size,
  table,
}: {
  readonly children: ReactNode
  readonly id: string
  readonly rows: () => Promise<readonly TData[]>
  readonly size: NonNullable<ButtonVariantProps["size"]>
  readonly table: DataGridTableInstance<TData>
}): JSX.Element => {
  const errorMessage = useErrorMessage()
  const exporting = useMutation({
    mutationFn: async () => {
      const content = csvOfRows(table, await rows())
      downloadFile({ content, fileName: `${id}-${new Date().toISOString().slice(0, ISO_DAY_LENGTH)}.csv`, type: CSV_MEDIA_TYPE })
    },
    onError: (error) => {
      toast.error(errorMessage(error))
    },
  })

  return (
    <Button
      isPending={exporting.isPending}
      onPress={() => {
        exporting.mutate()
      }}
      size={size}
      variant="outline"
    >
      <Download aria-hidden />
      {children}
    </Button>
  )
}

const DataGridSearch = ({
  label,
  onSearch,
  search,
}: {
  readonly label: string
  readonly onSearch: (text: string) => void
  readonly search: string
}): JSX.Element => (
  <SearchField aria-label={label} className="min-w-56 flex-1 basis-72" onChange={onSearch} value={search}>
    <InputGroup>
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput className="[&::-webkit-search-cancel-button]:hidden" maxLength={SEARCH_MAX_LENGTH} placeholder={label} />
      {search.length > 0 && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs">
            <X aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  </SearchField>
)

const DensityToggle = ({
  density,
  onDensityChange,
}: {
  readonly density: DataGridDensity
  readonly onDensityChange: (density: DataGridDensity) => void
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.toolbar")

  return (
    <ToggleGroup
      aria-label={t("density")}
      disallowEmptySelection
      onSelectionChange={(keys) => {
        for (const option of DATA_GRID_DENSITIES) {
          if (keys.has(option)) {
            onDensityChange(option)
          }
        }
      }}
      selectedKeys={[density]}
      selectionMode="single"
      spacing={0}
      variant="outline"
    >
      <ToggleGroupItem aria-label={t("comfortable")} id={DATA_GRID_DENSITY.COMFORTABLE}>
        <Rows3 aria-hidden />
      </ToggleGroupItem>
      <ToggleGroupItem aria-label={t("compact")} id={DATA_GRID_DENSITY.COMPACT}>
        <Rows4 aria-hidden />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

const ColumnsMenu = <TData extends DataGridRow>({ table }: { readonly table: DataGridTableInstance<TData> }): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.toolbar")
  const hideable = table.getAllLeafColumns().filter((column) => column.getCanHide())

  return (
    <DropdownMenuTrigger>
      <Button variant="outline">
        <Columns3 aria-hidden />
        <span className="@max-5xl/toolbar:sr-only">{t("columns")}</span>
      </Button>
      <DropdownMenu
        aria-label={t("columns")}
        className="min-w-48"
        disallowEmptySelection
        onSelectionChange={(keys: Selection) => {
          table.setColumnVisibility((visibility) => ({
            ...visibility,
            ...Object.fromEntries(hideable.map((column) => [column.id, keys === "all" || keys.has(column.id)])),
          }))
        }}
        placement="bottom end"
        selectedKeys={hideable.filter((column) => column.getIsVisible()).map((column) => column.id)}
        selectionMode="multiple"
      >
        {hideable.map((column) => (
          <DropdownMenuItem id={column.id} key={column.id} textValue={columnLabel(column)}>
            {columnLabel(column)}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

export interface DataGridToolbarProps<TData extends DataGridRow> {
  readonly announce: (message: string) => void
  readonly collectRows: () => Promise<readonly TData[]>
  readonly density: DataGridDensity
  readonly id: string
  readonly isChanged: boolean
  readonly onDensityChange: (density: DataGridDensity) => void
  readonly onReset: () => void
  readonly onSearch: (text: string) => void
  readonly search: string
  readonly searchLabel: string | undefined
  readonly table: DataGridTableInstance<TData>
}

export const DataGridToolbar = <TData extends DataGridRow>({
  announce,
  collectRows,
  density,
  id,
  isChanged,
  onDensityChange,
  onReset,
  onSearch,
  search,
  searchLabel,
  table,
}: DataGridToolbarProps<TData>): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.toolbar")

  return (
    <div className="@container/toolbar flex flex-col border-b border-border/70" data-slot="data-grid-toolbar">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        {searchLabel !== undefined && <DataGridSearch label={searchLabel} onSearch={onSearch} search={search} />}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DensityToggle density={density} onDensityChange={onDensityChange} />
          <ColumnsMenu table={table} />
          <ExportButton id={id} rows={collectRows} size="default" table={table}>
            <span className="@max-5xl/toolbar:sr-only">{t("export")}</span>
          </ExportButton>
          <Button
            isDisabled={!isChanged}
            onPress={() => {
              onReset()
              announce(t("resetDone"))
            }}
            variant="ghost"
          >
            <RotateCcw aria-hidden />
            <span className="@max-5xl/toolbar:sr-only">{t("reset")}</span>
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5">
        <DataGridFilterMenu table={table} />
        <DataGridFilterChips table={table} />
      </div>
    </div>
  )
}

export const DataGridSelection = <TData extends DataGridRow>({
  bulkActions,
  id,
  table,
}: {
  readonly bulkActions: ((rows: readonly TData[]) => ReactNode) | undefined
  readonly id: string
  readonly table: DataGridTableInstance<TData>
}): JSX.Element | undefined => {
  const t = useTranslations("components.custom.data-grid.selection")
  const rows = table.getSelectedRowModel().rows.map((row) => row.original)

  if (rows.length === 0) {
    return undefined
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <section
        aria-label={t("region")}
        className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-popover py-2 pr-2 pl-3 text-popover-foreground shadow-lg"
      >
        <span aria-live="polite" className="text-sm font-medium tabular-nums">
          {t("count", { count: rows.length })}
        </span>
        <ExportButton id={id} rows={() => Promise.resolve(rows)} size="sm" table={table}>
          {t("export")}
        </ExportButton>
        {bulkActions?.(rows)}
        <Button
          onPress={() => {
            table.resetRowSelection(true)
          }}
          size="sm"
          variant="ghost"
        >
          {t("clear")}
        </Button>
      </section>
    </div>
  )
}
