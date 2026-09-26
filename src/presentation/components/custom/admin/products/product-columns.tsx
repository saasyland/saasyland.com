import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import type { ProductStatus } from "~/src/modules/product/product.schema"
import type { Product } from "~/src/modules/product/product.types"

import { ADMIN_STATUS_BADGE_CLASSES, ADMIN_STATUS_DOT_CLASSES, type AdminStatusColor } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { RowActionsCell } from "~/src/presentation/components/custom/admin/row-actions-cell"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

const PRODUCT_STATUS_COLORS: Record<ProductStatus, AdminStatusColor> = {
  archived: "rose",
  draft: "amber",
  published: "emerald",
}

const METRICS_PLACEHOLDER = "—"

type ProductRow = Product["select"]

const ProductHeader = ({ id }: { readonly id: "metrics" | "pricing" | "product" | "status" | "type" }): string => {
  const t = useTranslations("pages.admin.products.table.headers")

  return t(id)
}

export const ItemName = ({ description, name }: { readonly description: string; readonly name: string }): JSX.Element => (
  <div className="whitespace-normal">
    <div className="text-sm font-medium text-foreground">{name}</div>
    <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
  </div>
)

const TypeCell = ({ getValue }: CellContext<DataTableFeatures, ProductRow, ProductRow["type"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.typeLabels")

  return (
    <Badge variant="outline" className="px-2 py-1 text-xs font-medium text-muted-foreground">
      {t(getValue())}
    </Badge>
  )
}

const StatusCell = ({ getValue }: CellContext<DataTableFeatures, ProductRow, ProductStatus>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.statusLabels")
  const color = PRODUCT_STATUS_COLORS[getValue()]

  return (
    <Badge variant="outline" className={cn("px-2 py-1 text-xs font-medium", ADMIN_STATUS_BADGE_CLASSES[color])}>
      <span className={cn("mr-1.5 size-1.5 rounded-full", ADMIN_STATUS_DOT_CLASSES[color])} />
      {t(getValue())}
    </Badge>
  )
}

const columnHelper = createColumnHelper<DataTableFeatures, ProductRow>()

export const productColumns = columnHelper.columns([
  columnHelper.accessor("name", {
    cell: ({ row }) => <ItemName description={row.original.description} name={row.original.name} />,
    enableSorting: false,
    header: () => <ProductHeader id="product" />,
  }),
  columnHelper.accessor("type", { cell: TypeCell, enableSorting: false, header: () => <ProductHeader id="type" /> }),
  columnHelper.accessor("priceCents", {
    cell: ({ row }) => (
      <div className="text-sm font-medium text-foreground">
        {row.original.priceCents} {row.original.currency}{" "}
        {row.original.billingCycle !== null && row.original.billingCycle !== "" && (
          <span className="font-normal text-muted-foreground">/ {row.original.billingCycle}</span>
        )}
      </div>
    ),
    enableSorting: false,
    header: () => <ProductHeader id="pricing" />,
  }),
  columnHelper.accessor("status", { cell: StatusCell, enableSorting: false, header: () => <ProductHeader id="status" /> }),
  columnHelper.display({
    cell: () => <span className="text-sm text-muted-foreground">{METRICS_PLACEHOLDER}</span>,
    header: () => <ProductHeader id="metrics" />,
    id: "metrics",
  }),
  columnHelper.display({ cell: RowActionsCell, header: "", id: "actions" }),
])
