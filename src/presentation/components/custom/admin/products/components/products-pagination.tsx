import type { JSX } from "react"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { ListPagination } from "~/src/modules/_core/utils/pagination"

import { Button } from "~/src/presentation/components/shadcn/button"

import { PAGINATION_FIRST_PAGE } from "~/src/presentation/components/custom/admin/constants/constants"

interface ProductsPaginationProps {
  readonly pagination?: ListPagination | undefined
  readonly end: number
  readonly total: number
}

export const ProductsPagination = ({ end, total, pagination }: ProductsPaginationProps): JSX.Element => {
  const count = pagination?.total ?? total
  const start = end === 0 ? 0 : (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? end) + PAGINATION_FIRST_PAGE
  const rangeEnd = end === 0 ? 0 : Math.min(start + end - PAGINATION_FIRST_PAGE, count)
  const tCommon = useTranslations("pages.admin")

  const t = useTranslations("pages.admin.products")
  return (
    <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground">
        {t("pagination.info", {
          end: rangeEnd,
          start,
          total: count,
        })}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 disabled:opacity-50"
          isDisabled={pagination === undefined || pagination.pageIndex === 0}
          {...(pagination === undefined
            ? {}
            : {
                onPress: () => {
                  pagination.onPageChange(pagination.pageIndex - PAGINATION_FIRST_PAGE)
                },
              })}
          aria-label={tCommon("labels.previousPage")}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="sm" className="size-8 p-0">
          {(pagination?.pageIndex ?? 0) + PAGINATION_FIRST_PAGE}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 disabled:opacity-50"
          isDisabled={pagination === undefined || (pagination.pageIndex + PAGINATION_FIRST_PAGE) * pagination.pageSize >= count}
          {...(pagination === undefined
            ? {}
            : {
                onPress: () => {
                  pagination.onPageChange(pagination.pageIndex + PAGINATION_FIRST_PAGE)
                },
              })}
          aria-label={tCommon("labels.nextPage")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
