import { type JSX, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { CATEGORY_KIND, type CATEGORY_KINDS, CATEGORY_VISIBILITIES, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import type { Category } from "~/src/modules/category/category.types"

import { PRODUCT_COLUMN_SIZES } from "~/src/data/admin-products"

import { Badge, type BadgeVariant } from "~/src/presentation/components/shadcn/badge"

import { ItemName } from "~/src/presentation/components/custom/admin/products/product-columns"
import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type CategoryRow = Category["select"]

type CategoryKind = (typeof CATEGORY_KINDS)[number]

const VISIBILITY_BADGES: Record<CategoryRow["visibility"], BadgeVariant> = {
  [CATEGORY_VISIBILITY.HIDDEN]: "neutral",
  [CATEGORY_VISIBILITY.PUBLIC]: "accent",
}

const NAME_HEADERS = {
  [CATEGORY_KIND.CATEGORY]: "categories.table.headers.category",
  [CATEGORY_KIND.COLLECTION]: "collections.table.headers.collection",
} as const satisfies Record<CategoryKind, string>

const NameCell = ({ row }: CellContext<DataGridFeatures, CategoryRow, string>): JSX.Element => (
  <ItemName description={row.original.description} name={row.original.name} />
)

const VisibilityCell = ({ getValue }: CellContext<DataGridFeatures, CategoryRow, CategoryRow["visibility"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.visibilityLabels")

  return <Badge variant={VISIBILITY_BADGES[getValue()]}>{t(getValue())}</Badge>
}

const DateCell = ({ getValue }: CellContext<DataGridFeatures, CategoryRow, Date>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-muted-foreground">{format.dateTime(getValue(), "date")}</span>
}

const columnHelper = createColumnHelper<DataGridFeatures, CategoryRow>()

export const useCategoryColumns = (kind: CategoryKind): DataGridColumn<CategoryRow>[] => {
  const t = useTranslations("pages.admin.products")

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          cell: NameCell,
          header: t(NAME_HEADERS[kind]),
          meta: { filter: { kind: DATA_GRID_FILTER.TEXT }, pinned: DATA_GRID_PIN.START },
          size: PRODUCT_COLUMN_SIZES.product,
        }),
        columnHelper.accessor("visibility", {
          cell: VisibilityCell,
          header: t("categories.table.headers.visibility"),
          meta: {
            export: ({ visibility }) => t(`table.visibilityLabels.${visibility}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: CATEGORY_VISIBILITIES.map((value) => ({ label: t(`table.visibilityLabels.${value}`), value })),
            },
          },
          size: PRODUCT_COLUMN_SIZES.status,
        }),
        columnHelper.accessor("createdAt", {
          cell: DateCell,
          header: t("categories.table.headers.createdAt"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE }, hidden: true },
          size: PRODUCT_COLUMN_SIZES.createdAt,
        }),
        columnHelper.accessor("updatedAt", {
          cell: DateCell,
          header: t("categories.table.headers.lastUpdated"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: PRODUCT_COLUMN_SIZES.updatedAt,
        }),
      ]),
    [kind, t],
  )
}
