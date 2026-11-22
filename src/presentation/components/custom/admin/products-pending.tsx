import type { JSX } from "react"

import { ADMIN_PRODUCT_TABS } from "~/src/data/admin-products"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"
import { PAGE_ROWS, PaginationPending } from "~/src/presentation/components/custom/admin/pending-blocks"

const ProductRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-lh w-32 scale-y-70 text-sm" />
      <Skeleton className="mt-0.5 h-lh w-48 scale-y-70 text-spec" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5.5 w-22 rounded-md" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5.5 w-22 rounded-md" />
    </TableCell>
  </TableRow>
)

export const AdminProductsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col">
    <AdminPageHeaderPending tabs={ADMIN_PRODUCT_TABS.length} />
    <div className="flex w-full flex-col">
      <div className="mt-8 space-y-4">
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-lh w-14 scale-y-70" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-lh w-10 scale-y-70" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-lh w-14 scale-y-70" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-lh w-12 scale-y-70" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PAGE_ROWS.map((row) => (
                <ProductRowPending key={row} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationPending />
      </div>
    </div>
  </div>
)
