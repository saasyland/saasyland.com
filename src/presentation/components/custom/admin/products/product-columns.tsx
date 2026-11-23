import { type JSX, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { PRODUCT_STATUS, PRODUCT_STATUSES, PRODUCT_TYPES } from "~/src/modules/product/product.constants"
import type { Product } from "~/src/modules/product/product.types"

import { PRODUCT_COLUMN_SIZES } from "~/src/data/admin-products"
import { CURRENCIES, fromMinorUnits } from "~/src/data/currencies"

import { Badge, type BadgeVariant } from "~/src/presentation/components/shadcn/badge"

import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type ProductRow = Product["listedProduct"]

export const PRODUCT_GRID_ID = "products"

const PRODUCT_STATUS_BADGES: Record<ProductRow["status"], BadgeVariant> = {
  [PRODUCT_STATUS.ARCHIVED]: "destructive",
  [PRODUCT_STATUS.DRAFT]: "warning",
  [PRODUCT_STATUS.PUBLISHED]: "accent",
}

export const ItemName = ({ description, name }: { readonly description: string; readonly name: string }): JSX.Element => (
  <div className="flex min-w-0 flex-col">
    <span className="truncate text-sm font-medium text-foreground">{name}</span>
    <span className="truncate text-spec text-muted-foreground">{description}</span>
  </div>
)

const NameCell = ({ row }: CellContext<DataGridFeatures, ProductRow, string>): JSX.Element => (
  <ItemName description={row.original.description} name={row.original.name} />
)

const TypeCell = ({ getValue }: CellContext<DataGridFeatures, ProductRow, ProductRow["type"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.typeLabels")

  return <Badge>{t(getValue())}</Badge>
}

const StatusCell = ({ getValue }: CellContext<DataGridFeatures, ProductRow, ProductRow["status"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.statusLabels")

  return <Badge variant={PRODUCT_STATUS_BADGES[getValue()]}>{t(getValue())}</Badge>
}

const PriceCell = ({ row }: CellContext<DataGridFeatures, ProductRow, number>): JSX.Element => {
  const format = useFormatter()
  const { billingCycle, currency, priceCents } = row.original

  return (
    <div className="truncate text-sm font-medium text-foreground tabular-nums">
      {format.number(fromMinorUnits(priceCents, currency), { currency, style: "currency" })}{" "}
      {billingCycle !== null && billingCycle !== "" && <span className="font-normal text-muted-foreground">/ {billingCycle}</span>}
    </div>
  )
}

const DateCell = ({ getValue }: CellContext<DataGridFeatures, ProductRow, Date>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-muted-foreground">{format.dateTime(getValue(), "date")}</span>
}

const exportedPrice = ({ billingCycle, currency, priceCents }: ProductRow): string => {
  const price = `${fromMinorUnits(priceCents, currency).toFixed(CURRENCIES[currency].exponent)} ${currency}`

  return billingCycle === null || billingCycle === "" ? price : `${price} / ${billingCycle}`
}

const columnHelper = createColumnHelper<DataGridFeatures, ProductRow>()

export const useProductColumns = (): DataGridColumn<ProductRow>[] => {
  const t = useTranslations("pages.admin.products.table")

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          cell: NameCell,
          header: t("headers.product"),
          id: "product",
          meta: { filter: { kind: DATA_GRID_FILTER.TEXT }, pinned: DATA_GRID_PIN.START },
          size: PRODUCT_COLUMN_SIZES.product,
        }),
        columnHelper.accessor("type", {
          cell: TypeCell,
          header: t("headers.type"),
          meta: {
            export: ({ type }) => t(`typeLabels.${type}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: PRODUCT_TYPES.map((value) => ({ label: t(`typeLabels.${value}`), value })),
            },
          },
          size: PRODUCT_COLUMN_SIZES.type,
        }),
        columnHelper.accessor("priceCents", {
          cell: PriceCell,
          header: t("headers.pricing"),
          id: "pricing",
          meta: { align: DATA_GRID_ALIGN.END, export: exportedPrice, filter: { kind: DATA_GRID_FILTER.NUMBER_RANGE } },
          size: PRODUCT_COLUMN_SIZES.pricing,
        }),
        columnHelper.accessor("status", {
          cell: StatusCell,
          header: t("headers.status"),
          meta: {
            export: ({ status }) => t(`statusLabels.${status}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: PRODUCT_STATUSES.map((value) => ({ label: t(`statusLabels.${value}`), value })),
            },
          },
          size: PRODUCT_COLUMN_SIZES.status,
        }),
        columnHelper.accessor("createdAt", {
          cell: DateCell,
          header: t("headers.createdAt"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE }, hidden: true },
          size: PRODUCT_COLUMN_SIZES.createdAt,
        }),
        columnHelper.accessor("updatedAt", {
          cell: DateCell,
          header: t("headers.updatedAt"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: PRODUCT_COLUMN_SIZES.updatedAt,
        }),
      ]),
    [t],
  )
}
