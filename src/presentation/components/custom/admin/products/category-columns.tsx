import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { Eye, EyeOff } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { CATEGORY_KIND, type CATEGORY_KINDS, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import type { Category } from "~/src/modules/category/category.types"

import { ADMIN_STATUS_BADGE_CLASSES } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { ItemName } from "~/src/presentation/components/custom/admin/products/product-columns"
import { RowActionsCell } from "~/src/presentation/components/custom/admin/products/row-actions-cell"
import { DataTableActionsHeader, type DataTableFeatures } from "~/src/presentation/components/custom/data-table"

const ITEMS_PLACEHOLDER = "0"

type CategoryRow = Category["select"]

type CategoryKind = (typeof CATEGORY_KINDS)[number]

const NameHeader = ({ kind }: { readonly kind: CategoryKind }): string => {
  const t = useTranslations("pages.admin.products")

  if (kind === CATEGORY_KIND.COLLECTION) {
    return t("collections.table.headers.collection")
  }

  return t("categories.table.headers.category")
}

const CategoryHeader = ({ id }: { readonly id: "items" | "lastUpdated" | "visibility" }): string => {
  const t = useTranslations("pages.admin.products")

  return t(`categories.table.headers.${id}`)
}

const VisibilityCell = ({ getValue }: CellContext<DataTableFeatures, CategoryRow, CategoryRow["visibility"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.visibilityLabels")
  const visibility = getValue()

  return (
    <Badge
      className={cn("px-2 py-1 text-[10px] font-medium", {
        [ADMIN_STATUS_BADGE_CLASSES.emerald]: visibility === CATEGORY_VISIBILITY.PUBLIC,
        [ADMIN_STATUS_BADGE_CLASSES.neutral]: visibility === CATEGORY_VISIBILITY.HIDDEN,
      })}
      variant="outline"
    >
      {visibility === CATEGORY_VISIBILITY.PUBLIC && <Eye className="mr-1.5 size-3" />}
      {visibility === CATEGORY_VISIBILITY.HIDDEN && <EyeOff className="mr-1.5 size-3" />}
      {t(visibility)}
    </Badge>
  )
}

const ItemsCell = (): JSX.Element => {
  const t = useTranslations("pages.admin.products.categories.table")

  return (
    <div className="text-sm font-medium text-foreground">
      {ITEMS_PLACEHOLDER} <span className="font-normal text-muted-foreground">{t("itemsUnit")}</span>
    </div>
  )
}

const UpdatedCell = ({ getValue }: CellContext<DataTableFeatures, CategoryRow, Date>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-muted-foreground">{format.dateTime(getValue(), "date")}</span>
}

const columnHelper = createColumnHelper<DataTableFeatures, CategoryRow>()

const columnsFor = (kind: CategoryKind) =>
  columnHelper.columns([
    columnHelper.accessor("name", {
      cell: ({ row }) => <ItemName description={row.original.description} name={row.original.name} />,
      enableSorting: false,
      header: () => <NameHeader kind={kind} />,
    }),
    columnHelper.accessor("visibility", { cell: VisibilityCell, enableSorting: false, header: () => <CategoryHeader id="visibility" /> }),
    columnHelper.display({ cell: ItemsCell, header: () => <CategoryHeader id="items" />, id: "items" }),
    columnHelper.accessor("updatedAt", { cell: UpdatedCell, enableSorting: false, header: () => <CategoryHeader id="lastUpdated" /> }),
    columnHelper.display({ cell: RowActionsCell, header: DataTableActionsHeader, id: "actions" }),
  ])

export const categoryColumns = {
  [CATEGORY_KIND.CATEGORY]: columnsFor(CATEGORY_KIND.CATEGORY),
  [CATEGORY_KIND.COLLECTION]: columnsFor(CATEGORY_KIND.COLLECTION),
}
