import type { JSX } from "react"

import { ADMIN_PRODUCT_TABS } from "~/src/data/admin-products"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  LongDescriptionPending,
  PAGE_ROWS,
  PaginationPending,
  TitlePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"

const ProductRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-lh w-32 scale-y-70 text-sm" />
      <Skeleton className="mt-0.5 h-lh w-48 scale-y-70 text-spec" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-22 rounded-md" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-22 rounded-md" />
    </TableCell>
  </TableRow>
)

export const AdminProductsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div>
      <TitlePending />
      <LongDescriptionPending />
    </div>
    <div className="flex w-full flex-col gap-2">
      <div className="border-b border-border">
        <div className="no-scrollbar flex h-8 min-h-8 flex-1 items-center justify-start gap-6 overflow-x-auto p-[3px]">
          {ADMIN_PRODUCT_TABS.map((tab) => (
            <Skeleton className="h-lh w-20 shrink-0 scale-y-70 text-sm" key={tab} />
          ))}
        </div>
      </div>
      <div className="mt-6 space-y-4">
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
