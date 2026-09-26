import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"
import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { Eye, EyeOff } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Category } from "~/src/modules/category/category.types"

import { useDateFormatter } from "~/src/hooks/use-date-formatter"

import { ADMIN_STATUS_BADGE_CLASSES } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { ItemName } from "~/src/presentation/components/custom/admin/products/product-columns"
import { RowActionsCell } from "~/src/presentation/components/custom/admin/row-actions-cell"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

const ITEMS_PLACEHOLDER = "0"

type CategoryRow = Category["select"]

const CategoryHeader = ({ id }: { readonly id: "items" | "lastUpdated" | "name" | "visibility" }): string => {
  const tab = useRouterState({ select: (state) => state.location.search.tab })
  const t = useTranslations("pages.admin.products")

  if (id !== "name") {
    return t(`categories.table.headers.${id}`)
  }

  if (tab === "collections") {
    return t("collections.table.headers.collection")
  }

  return t("categories.table.headers.category")
}

const VisibilityCell = ({ getValue }: CellContext<DataTableFeatures, CategoryRow, CategoryRow["visibility"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.visibilityLabels")
  const visibility = getValue()

  return (
    <Badge
      className={cn("px-2 py-1 text-[10px] font-medium", {
        [ADMIN_STATUS_BADGE_CLASSES.emerald]: visibility === "public",
        [ADMIN_STATUS_BADGE_CLASSES.neutral]: visibility === "hidden",
      })}
      variant="outline"
    >
      {visibility === "public" && <Eye className="mr-1.5 size-3" />}
      {visibility === "hidden" && <EyeOff className="mr-1.5 size-3" />}
      {t(visibility)}
    </Badge>
  )
}

const ItemsCell = (): JSX.Element => {
  const t = useTranslations("pages.admin.labels")

  return (
    <div className="text-sm font-medium text-foreground">
      {ITEMS_PLACEHOLDER} <span className="font-normal text-muted-foreground">{t("products")}</span>
    </div>
  )
}

const UpdatedCell = ({ getValue }: CellContext<DataTableFeatures, CategoryRow, Date>): JSX.Element => {
  const { formatDate } = useDateFormatter({ day: "numeric", month: "short", year: "numeric" })

  return <span className="text-sm text-muted-foreground">{formatDate({ value: getValue() })}</span>
}

const columnHelper = createColumnHelper<DataTableFeatures, CategoryRow>()

export const categoryColumns = columnHelper.columns([
  columnHelper.accessor("name", {
    cell: ({ row }) => <ItemName description={row.original.description} name={row.original.name} />,
    enableSorting: false,
    header: () => <CategoryHeader id="name" />,
  }),
  columnHelper.accessor("visibility", { cell: VisibilityCell, enableSorting: false, header: () => <CategoryHeader id="visibility" /> }),
  columnHelper.display({ cell: ItemsCell, header: () => <CategoryHeader id="items" />, id: "items" }),
  columnHelper.accessor("updatedAt", { cell: UpdatedCell, enableSorting: false, header: () => <CategoryHeader id="lastUpdated" /> }),
  columnHelper.display({ cell: RowActionsCell, header: "", id: "actions" }),
])
