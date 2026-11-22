import type { JSX } from "react"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { PAGE_SIZES } from "~/src/modules/_core/utils/pagination"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import type { DataGridRow, DataGridTableInstance } from "~/src/presentation/components/custom/data-grid"

const FIRST_PAGE_NUMBER = 1

export const DataGridPagination = <TData extends DataGridRow>({
  isRefreshing,
  table,
}: {
  readonly isRefreshing: boolean
  readonly table: DataGridTableInstance<TData>
}): JSX.Element => {
  const t = useTranslations("components.custom.data-grid.pagination")
  const { pageIndex, pageSize } = table.state.pagination
  const total = table.getRowCount()
  const pageCount = Math.max(table.getPageCount(), FIRST_PAGE_NUMBER)
  const canGoBack = !isRefreshing && table.getCanPreviousPage()
  const canGoOn = !isRefreshing && table.getCanNextPage()

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-spec text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Select
          className="flex items-center gap-2"
          fieldLabel={t("rowsPerPage")}
          fieldLabelClassName="text-spec font-normal text-muted-foreground"
          onChange={(key) => {
            table.setPageSize(Number(key))
          }}
          value={String(pageSize)}
        >
          <SelectTrigger className="w-18" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem id={String(size)} key={size}>
                {String(size)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span aria-live="polite" className="tabular-nums">
          {t("range", {
            from: Math.min(pageIndex * pageSize + FIRST_PAGE_NUMBER, total),
            to: Math.min((pageIndex + FIRST_PAGE_NUMBER) * pageSize, total),
            total,
          })}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="mr-2 tabular-nums">{t("page", { current: pageIndex + FIRST_PAGE_NUMBER, total: pageCount })}</span>
        <Button
          aria-label={t("first")}
          isDisabled={!canGoBack}
          onPress={() => {
            table.firstPage()
          }}
          size="icon-sm"
          variant="outline"
        >
          <ChevronsLeft aria-hidden />
        </Button>
        <Button
          aria-label={t("previous")}
          isDisabled={!canGoBack}
          onPress={() => {
            table.previousPage()
          }}
          size="icon-sm"
          variant="outline"
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          aria-label={t("next")}
          isDisabled={!canGoOn}
          onPress={() => {
            table.nextPage()
          }}
          size="icon-sm"
          variant="outline"
        >
          <ChevronRight aria-hidden />
        </Button>
        <Button
          aria-label={t("last")}
          isDisabled={!canGoOn}
          onPress={() => {
            table.lastPage()
          }}
          size="icon-sm"
          variant="outline"
        >
          <ChevronsRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
