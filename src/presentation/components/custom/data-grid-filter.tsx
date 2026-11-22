import { type JSX, useState } from "react"

import { type CalendarDate, type DateValue, fromDate, toCalendarDate, today } from "@internationalized/date"
import type { Column } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ListFilter, X } from "lucide-react"
import { Autocomplete, Dialog, Heading, NumberField, type RangeValue, type Selection, TextField, useFilter } from "react-aria-components"
import { useFormatter, useTimeZone, useTranslations } from "use-intl/react"
import zod from "zod/v4"

import { columnLabel } from "~/src/integrations/tanstack-table/table.columns"
import {
  DATA_GRID_FILTER,
  DATA_GRID_TYPING_DELAY_MS,
  type DataGridDateRange,
  type DataGridFeatures,
  type DataGridFilter,
  type DataGridNumberRange,
} from "~/src/integrations/tanstack-table/table.features"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { SEARCH_MAX_LENGTH } from "~/src/modules/_core/utils/pagination"
import { dateRangeField, numberRangeField } from "~/src/modules/_core/utils/zod-fields"

import { useDebouncedCallback } from "~/src/hooks/use-debounced-callback"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { ButtonGroup } from "~/src/presentation/components/shadcn/button-group"
import { RangeCalendar } from "~/src/presentation/components/shadcn/calendar"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"
import { Popover, PopoverTrigger } from "~/src/presentation/components/shadcn/popover"
import { SelectInput, SelectItem, SelectList } from "~/src/presentation/components/shadcn/select"

import type { DataGridRow, DataGridTableInstance } from "~/src/presentation/components/custom/data-grid"

type FilterColumn<TData extends DataGridRow> = Column<DataGridFeatures, TData>

type OptionsFilter = Extract<DataGridFilter, { readonly options: unknown }>

const OPTION_SEARCH_MIN = 8

const FIRST_OPTION = "first"

const SUMMARY_LABELS_MAX = 2

const LAST_MOMENT_OF_DAY_MS = 1

const DATE_PRESETS = [
  { name: "last7Days", span: { days: 7 } },
  { name: "last30Days", span: { days: 30 } },
  { name: "last12Months", span: { months: 12 } },
] as const

const textValue = zod.string()

const optionValues = zod.array(zod.string())

const textOf = <TData extends DataGridRow>(column: FilterColumn<TData>): string => {
  const parsed = textValue.safeParse(column.getFilterValue())

  return parsed.success ? parsed.data : ""
}

const valuesOf = <TData extends DataGridRow>(column: FilterColumn<TData>): string[] => {
  const value = column.getFilterValue()
  const parsed = optionValues.safeParse(value)

  if (parsed.success) {
    return parsed.data
  }

  const text = textValue.safeParse(value)

  return text.success ? [text.data] : []
}

const numberRangeOf = <TData extends DataGridRow>(column: FilterColumn<TData>): DataGridNumberRange => {
  const parsed = numberRangeField.safeParse(column.getFilterValue())

  return parsed.success ? parsed.data : {}
}

const dateRangeOf = <TData extends DataGridRow>(column: FilterColumn<TData>): DataGridDateRange => {
  const parsed = dateRangeField.safeParse(column.getFilterValue())

  return parsed.success ? parsed.data : {}
}

const dayOf = (moment: number, timeZone: string): CalendarDate => toCalendarDate(fromDate(new Date(moment), timeZone))

const dayRange = (start: DateValue, end: DateValue, timeZone: string): DataGridDateRange => ({
  from: toCalendarDate(start).toDate(timeZone).getTime(),
  to: toCalendarDate(end).add({ days: 1 }).toDate(timeZone).getTime() - LAST_MOMENT_OF_DAY_MS,
})

const withBound = (range: DataGridNumberRange, bound: keyof DataGridNumberRange, value: number): DataGridNumberRange | undefined => {
  const next = { ...range, [bound]: Number.isNaN(value) ? undefined : value }
  const { max, min } = next
  const bounded = { ...(max !== undefined && { max }), ...(min !== undefined && { min }) }

  return Object.keys(bounded).length === 0 ? undefined : bounded
}

const useTimeZoneName = (): string => useTimeZone() ?? I18N.DEFAULT_TIMEZONE

const BOUNDS = { AT_LEAST: "atLeast", AT_MOST: "atMost", BETWEEN: "between" } as const

const shown = (value: number | undefined, show: (value: number) => string): string => (value === undefined ? "" : show(value))

const boundsOf = (low: unknown, high: unknown): (typeof BOUNDS)[keyof typeof BOUNDS] => {
  if (low === undefined) {
    return BOUNDS.AT_MOST
  }

  return high === undefined ? BOUNDS.AT_LEAST : BOUNDS.BETWEEN
}

const useFilterSummary = (): (<TData extends DataGridRow>(column: FilterColumn<TData>, filter: DataGridFilter) => string) => {
  const t = useTranslations("components.custom.data-grid.filters")
  const format = useFormatter()

  return (column, filter) => {
    if (filter.kind === DATA_GRID_FILTER.TEXT) {
      return t("text.summary", { value: textOf(column) })
    }

    if (filter.kind === DATA_GRID_FILTER.NUMBER_RANGE) {
      const { max, min } = numberRangeOf(column)
      return t(`range.${boundsOf(min, max)}`, { max: shown(max, format.number), min: shown(min, format.number) })
    }

    if (filter.kind === DATA_GRID_FILTER.DATE_RANGE) {
      const { from, to } = dateRangeOf(column)
      const day = (moment: number): string => format.dateTime(moment, "date")
      return t(`date.${boundsOf(from, to)}`, { from: shown(from, day), to: shown(to, day) })
    }

    const values = valuesOf(column)
    const labels = filter.options.filter((option) => values.includes(option.value)).map((option) => option.label)

    if (labels.length > SUMMARY_LABELS_MAX) {
      return t("options.summary", { count: labels.length })
    }

    return format.list(labels, { type: "disjunction" })
  }
}

const TextFilter = <TData extends DataGridRow>({
  column,
  label,
}: {
  readonly column: FilterColumn<TData>
  readonly label: string
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.filters.text")
  const [text, setText] = useState(() => textOf(column))
  const applying = useDebouncedCallback((value: string) => {
    const trimmed = value.trim()
    column.setFilterValue(trimmed.length === 0 ? undefined : trimmed)
  }, DATA_GRID_TYPING_DELAY_MS)

  return (
    <TextField
      aria-label={label}
      autoFocus
      onChange={(value) => {
        setText(value)
        applying.schedule(value)
      }}
      value={text}
    >
      <Input maxLength={SEARCH_MAX_LENGTH} placeholder={t("placeholder")} />
    </TextField>
  )
}

const OptionsList = <TData extends DataGridRow>({
  column,
  filter,
  label,
}: {
  readonly column: FilterColumn<TData>
  readonly filter: OptionsFilter
  readonly label: string
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.filters.options")
  const isMultiple = filter.kind === DATA_GRID_FILTER.MULTI_SELECT

  return (
    <SelectList
      aria-label={label}
      autoFocus={filter.options.length < OPTION_SEARCH_MIN && FIRST_OPTION}
      className="max-h-64"
      escapeKeyBehavior="none"
      onSelectionChange={(keys: Selection) => {
        const values = keys === "all" ? filter.options.map(({ value }) => value) : [...keys].map(String)
        if (isMultiple) {
          column.setFilterValue(values.length === 0 ? undefined : values)
          return
        }
        column.setFilterValue(values[0])
      }}
      renderEmptyState={() => <p className="px-1.5 py-2 text-sm text-muted-foreground">{t("none")}</p>}
      selectedKeys={valuesOf(column)}
      selectionMode={isMultiple ? "multiple" : "single"}
    >
      {filter.options.map((option) => (
        <SelectItem id={option.value} key={option.value} textValue={option.label}>
          {option.label}
        </SelectItem>
      ))}
    </SelectList>
  )
}

const OptionsFilterControl = <TData extends DataGridRow>({
  column,
  filter,
  label,
}: {
  readonly column: FilterColumn<TData>
  readonly filter: OptionsFilter
  readonly label: string
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.filters.options")
  const { contains } = useFilter({ sensitivity: "base" })

  if (filter.options.length < OPTION_SEARCH_MIN) {
    return <OptionsList column={column} filter={filter} label={label} />
  }

  return (
    <Autocomplete filter={contains}>
      <SelectInput aria-label={t("search")} autoFocus className="p-0 pb-1" />
      <OptionsList column={column} filter={filter} label={label} />
    </Autocomplete>
  )
}

const NumberRangeFilter = <TData extends DataGridRow>({ column }: { readonly column: FilterColumn<TData> }): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.filters.range")
  const range = numberRangeOf(column)

  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberField
        autoFocus
        className="flex flex-col gap-1.5"
        onChange={(value) => {
          column.setFilterValue(withBound(range, "min", value))
        }}
        value={range.min ?? Number.NaN}
      >
        <Label>{t("min")}</Label>
        <Input />
      </NumberField>
      <NumberField
        className="flex flex-col gap-1.5"
        onChange={(value) => {
          column.setFilterValue(withBound(range, "max", value))
        }}
        value={range.max ?? Number.NaN}
      >
        <Label>{t("max")}</Label>
        <Input />
      </NumberField>
    </div>
  )
}

const DateRangeFilter = <TData extends DataGridRow>({
  column,
  label,
}: {
  readonly column: FilterColumn<TData>
  readonly label: string
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.filters.date")
  const timeZone = useTimeZoneName()
  const { from, to } = dateRangeOf(column)
  const days = from !== undefined && to !== undefined && { defaultValue: { end: dayOf(to, timeZone), start: dayOf(from, timeZone) } }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex flex-wrap gap-1.5 sm:w-36 sm:flex-col sm:border-r sm:border-border sm:pr-3">
        {DATE_PRESETS.map(({ name, span }) => (
          <Button
            className="sm:justify-start"
            key={name}
            onPress={() => {
              const end = today(timeZone)
              column.setFilterValue(dayRange(end.subtract(span).add({ days: 1 }), end, timeZone))
            }}
            size="xs"
            variant="outline"
          >
            {t(name)}
          </Button>
        ))}
      </div>
      <RangeCalendar
        aria-label={label}
        className="mx-auto sm:mx-0"
        key={`${String(from)}-${String(to)}`}
        onChange={(value: RangeValue<DateValue>) => {
          column.setFilterValue(dayRange(value.start, value.end, timeZone))
        }}
        {...days}
      />
    </div>
  )
}

const FilterControl = <TData extends DataGridRow>({
  column,
  filter,
  label,
}: {
  readonly column: FilterColumn<TData>
  readonly filter: DataGridFilter
  readonly label: string
}): JSX.Element => {
  if (filter.kind === DATA_GRID_FILTER.TEXT) {
    return <TextFilter column={column} label={label} />
  }

  if (filter.kind === DATA_GRID_FILTER.NUMBER_RANGE) {
    return <NumberRangeFilter column={column} />
  }

  if (filter.kind === DATA_GRID_FILTER.DATE_RANGE) {
    return <DateRangeFilter column={column} label={label} />
  }

  return <OptionsFilterControl column={column} filter={filter} label={label} />
}

const FilterEditor = <TData extends DataGridRow>({
  column,
  filter,
  onBack,
}: {
  readonly column: FilterColumn<TData>
  readonly filter: DataGridFilter
  readonly onBack?: () => void
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.filters")
  const label = columnLabel(column)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 items-center gap-1">
        {onBack !== undefined && (
          <Button aria-label={t("back")} onPress={onBack} size="icon-xs" variant="ghost">
            <ChevronLeft aria-hidden />
          </Button>
        )}
        <Heading className="min-w-0 flex-1 truncate text-sm font-medium" slot="title">
          {t("title", { column: label })}
        </Heading>
        <Button
          isDisabled={!column.getIsFiltered()}
          onPress={() => {
            column.setFilterValue(undefined)
          }}
          size="xs"
          variant="ghost"
        >
          {t("clear")}
        </Button>
      </div>
      <FilterControl column={column} filter={filter} label={label} />
    </div>
  )
}

const ColumnChooser = <TData extends DataGridRow>({
  filterable,
  onChoose,
}: {
  readonly filterable: readonly FilterableColumn<TData>[]
  readonly onChoose: (columnId: string) => void
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.filters")
  const summary = useFilterSummary()

  return (
    <div className="flex flex-col gap-2">
      <Heading className="px-1.5 text-label text-muted-foreground uppercase" slot="title">
        {t("choose")}
      </Heading>
      <SelectList
        aria-label={t("choose")}
        autoFocus={FIRST_OPTION}
        onAction={(key) => {
          onChoose(String(key))
        }}
      >
        {filterable.map(({ column, filter }) => (
          <SelectItem
            aria-label={
              column.getIsFiltered() ? t("chip", { column: columnLabel(column), value: summary(column, filter) }) : columnLabel(column)
            }
            id={column.id}
            key={column.id}
            textValue={columnLabel(column)}
          >
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="truncate">{columnLabel(column)}</span>
              {column.getIsFiltered() && (
                <span className="max-w-32 truncate text-spec text-muted-foreground">{summary(column, filter)}</span>
              )}
            </span>
            <ChevronRight aria-hidden className="text-muted-foreground" />
          </SelectItem>
        ))}
      </SelectList>
    </div>
  )
}

interface FilterableColumn<TData extends DataGridRow> {
  readonly column: FilterColumn<TData>
  readonly filter: DataGridFilter
}

const filterableColumns = <TData extends DataGridRow>(table: DataGridTableInstance<TData>): FilterableColumn<TData>[] =>
  table.getAllLeafColumns().flatMap((column) => {
    const filter = column.columnDef.meta?.filter
    return filter === undefined ? [] : [{ column, filter }]
  })

export const DataGridFilterMenu = <TData extends DataGridRow>({ table }: { readonly table: DataGridTableInstance<TData> }): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.filters")
  const [columnId, setColumnId] = useState<string>()
  const filterable = filterableColumns(table)
  const editing = filterable.find(({ column }) => column.id === columnId)
  const active = table.state.columnFilters.length

  return (
    <PopoverTrigger
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setColumnId(undefined)
        }
      }}
    >
      <Button size="sm" variant="outline">
        <ListFilter aria-hidden />
        {t("filter")}
        {active > 0 && (
          <Badge className="h-4.5 px-1.5 tabular-nums" variant="accent">
            {active}
          </Badge>
        )}
      </Button>
      <Popover className={cn("w-80 p-3", { "sm:w-auto": editing?.filter.kind === DATA_GRID_FILTER.DATE_RANGE })} placement="bottom start">
        <Dialog aria-label={t("filter")} className="outline-hidden">
          {editing === undefined && <ColumnChooser filterable={filterable} onChoose={setColumnId} />}
          {editing !== undefined && (
            <FilterEditor
              column={editing.column}
              filter={editing.filter}
              onBack={() => {
                setColumnId(undefined)
              }}
            />
          )}
        </Dialog>
      </Popover>
    </PopoverTrigger>
  )
}

const FilterChip = <TData extends DataGridRow>({
  column,
  filter,
}: {
  readonly column: FilterColumn<TData>
  readonly filter: DataGridFilter
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.filters")
  const label = columnLabel(column)
  const value = useFilterSummary()(column, filter)

  return (
    <ButtonGroup aria-label={label}>
      <PopoverTrigger>
        <Button aria-label={t("chip", { column: label, value })} className="max-w-72 min-w-0" size="sm" variant="outline">
          <span className="shrink-0 text-muted-foreground">{label}</span>
          <span className="truncate">{value}</span>
        </Button>
        <Popover className={cn("w-80 p-3", { "sm:w-auto": filter.kind === DATA_GRID_FILTER.DATE_RANGE })} placement="bottom start">
          <Dialog aria-label={label} className="outline-hidden">
            <FilterEditor column={column} filter={filter} />
          </Dialog>
        </Popover>
      </PopoverTrigger>
      <Button
        aria-label={t("remove", { column: label })}
        onPress={() => {
          column.setFilterValue(undefined)
        }}
        size="icon-sm"
        variant="outline"
      >
        <X aria-hidden />
      </Button>
    </ButtonGroup>
  )
}

export const DataGridFilterChips = <TData extends DataGridRow>({
  table,
}: {
  readonly table: DataGridTableInstance<TData>
}): JSX.Element | undefined => {
  const t = useTranslations("components.custom.data-grid.filters")
  const active = filterableColumns(table).filter(({ column }) => column.getIsFiltered())

  if (active.length === 0) {
    return undefined
  }

  return (
    <div aria-label={t("active")} className="flex flex-wrap items-center gap-2" role="group">
      {active.map(({ column, filter }) => (
        <FilterChip column={column} filter={filter} key={column.id} />
      ))}
      <Button
        onPress={() => {
          table.resetColumnFilters(true)
        }}
        size="sm"
        variant="ghost"
      >
        {t("clearAll")}
      </Button>
    </div>
  )
}
