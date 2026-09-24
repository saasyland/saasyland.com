import type { JSX, ReactNode } from "react"

import type { ListPagination } from "~/src/modules/_core/utils/pagination"

import { Card } from "~/src/presentation/components/shadcn/card"

import { ProductsPagination } from "~/src/presentation/components/custom/admin/products/components/products-pagination"

interface ProductsTableCardProps {
  readonly pagination?: ListPagination | undefined
  readonly children: ReactNode
  readonly end: number
  readonly total: number
}

export const ProductsTableCard = ({ children, end, total, pagination }: ProductsTableCardProps): JSX.Element => (
  <Card className="overflow-hidden">
    <div className="custom-scrollbar overflow-x-auto">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>

    <ProductsPagination end={end} total={total} pagination={pagination} />
  </Card>
)
