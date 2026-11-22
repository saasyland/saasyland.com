import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { fromMinorUnits } from "~/src/modules/_core/constants/currency"
import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import type { Product } from "~/src/modules/product/product.types"

import { ADMIN_STATUS_BADGE_CLASSES, ADMIN_STATUS_DOT_CLASSES, type AdminStatusColor } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

const PRODUCT_STATUS_COLORS: Record<ProductRow["status"], AdminStatusColor> = {
  [PRODUCT_STATUS.ARCHIVED]: "rose",
  [PRODUCT_STATUS.DRAFT]: "amber",
  [PRODUCT_STATUS.PUBLISHED]: "emerald",
}

type ProductRow = Product["listedProduct"]

const ProductHeader = ({ id }: { readonly id: "pricing" | "product" | "status" | "type" }): string => {
  const t = useTranslations("pages.admin.products.table.headers")

  return t(id)
}

export const ItemName = ({ description, name }: { readonly description: string; readonly name: string }): JSX.Element => (
  <div className="whitespace-normal">
    <div className="text-sm font-medium text-foreground">{name}</div>
    <div className="mt-0.5 text-spec text-muted-foreground">{description}</div>
  </div>
)

const TypeCell = ({ getValue }: CellContext<DataTableFeatures, ProductRow, ProductRow["type"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.typeLabels")

  return (
    <Badge variant="outline" className="px-2 py-1 text-label text-muted-foreground">
      {t(getValue())}
    </Badge>
  )
}

const StatusCell = ({ getValue }: CellContext<DataTableFeatures, ProductRow, ProductRow["status"]>): JSX.Element => {
  const t = useTranslations("pages.admin.products.table.statusLabels")
  const color = PRODUCT_STATUS_COLORS[getValue()]

  return (
    <Badge variant="outline" className={cn("px-2 py-1 text-label", ADMIN_STATUS_BADGE_CLASSES[color])}>
      <span className={cn("mr-1.5 size-1.5 rounded-full", ADMIN_STATUS_DOT_CLASSES[color])} />
      {t(getValue())}
    </Badge>
  )
}

const PriceCell = ({ row }: CellContext<DataTableFeatures, ProductRow, number>): JSX.Element => {
  const format = useFormatter()
  const { billingCycle, currency, priceCents } = row.original

  return (
    <div className="text-sm font-medium text-foreground tabular-nums">
      {format.number(fromMinorUnits(priceCents, currency), { currency, style: "currency" })}{" "}
      {billingCycle !== null && billingCycle !== "" && <span className="font-normal text-muted-foreground">/ {billingCycle}</span>}
    </div>
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
  columnHelper.accessor("priceCents", { cell: PriceCell, enableSorting: false, header: () => <ProductHeader id="pricing" /> }),
  columnHelper.accessor("status", { cell: StatusCell, enableSorting: false, header: () => <ProductHeader id="status" /> }),
])
