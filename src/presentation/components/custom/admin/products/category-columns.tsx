import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { CATEGORY_KIND, type CATEGORY_KINDS, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import type { Category } from "~/src/modules/category/category.types"

import { Badge, type BadgeVariant } from "~/src/presentation/components/shadcn/badge"

import { ItemName } from "~/src/presentation/components/custom/admin/products/product-columns"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type CategoryRow = Category["select"]

const VISIBILITY_BADGES: Record<CategoryRow["visibility"], BadgeVariant> = {
  [CATEGORY_VISIBILITY.HIDDEN]: "neutral",
  [CATEGORY_VISIBILITY.PUBLIC]: "accent",
}

type CategoryKind = (typeof CATEGORY_KINDS)[number]

const NameHeader = ({ kind }: { readonly kind: CategoryKind }): string => {
  const t = useTranslations("pages.admin.products")

  if (kind === CATEGORY_KIND.COLLECTION) {
    return t("collections.table.headers.collection")
  }

  return t("categories.table.headers.category")
}

const CategoryHeader = ({ id }: { readonly id: "lastUpdated" | "visibility" }): string => {
  const t = useTranslations("pages.admin.products")

  return t(`categories.table.headers.${id}`)
}

const VisibilityCell = ({ getValue }: CellContext<DataTableFeatures, CategoryRow, CategoryRow["visibility"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.visibilityLabels")

  return <Badge variant={VISIBILITY_BADGES[getValue()]}>{t(getValue())}</Badge>
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
    columnHelper.accessor("updatedAt", { cell: UpdatedCell, enableSorting: false, header: () => <CategoryHeader id="lastUpdated" /> }),
  ])

export const categoryColumns = {
  [CATEGORY_KIND.CATEGORY]: columnsFor(CATEGORY_KIND.CATEGORY),
  [CATEGORY_KIND.COLLECTION]: columnsFor(CATEGORY_KIND.COLLECTION),
}
