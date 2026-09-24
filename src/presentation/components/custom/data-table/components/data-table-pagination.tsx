import type { JSX } from "react"

import type { RowData } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"

import type { DataTableInstance } from "~/src/presentation/components/custom/data-table/features"

const FIRST_PAGE = 1

export const DataTablePagination = <TData extends RowData>({ table }: { readonly table: DataTableInstance<TData> }): JSX.Element => {
  const t = useTranslations("components.custom.data-table.pagination")
  const classNames = table.options.meta?.classNames
  const isLoading = table.options.meta?.isLoading
  const selectedCount = table.getSelectedRowIds().length

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground", classNames?.pagination)}>
      <div className="flex items-center gap-3">
        <span>{t("rowCount", { count: table.getRowCount() })}</span>
        {selectedCount > 0 && <span>{t("selectedCount", { selected: selectedCount })}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span>
          {t("pageIndicator", {
            current: table.state.pagination.pageIndex + FIRST_PAGE,
            total: Math.max(table.getPageCount(), FIRST_PAGE),
          })}
        </span>
        <Button
          aria-label={t("previousPage")}
          isDisabled={isLoading === true || !table.getCanPreviousPage()}
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
          isDisabled={isLoading === true || !table.getCanNextPage()}
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
