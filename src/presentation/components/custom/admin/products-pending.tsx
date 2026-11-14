import type { JSX } from "react"

import { ADMIN_PRODUCT_TABS } from "~/src/data/admin"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  FieldPending,
  LongDescriptionPending,
  PAGE_ROWS,
  PaginationPending,
  RowActionPending,
  SwitchPending,
  TitlePending,
  UploadZonePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"

const ProductRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-lh w-32 scale-y-70 text-sm" />
      <Skeleton className="mt-0.5 h-lh w-48 scale-y-70 text-xs" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-22 rounded-4xl" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-28 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-22 rounded-4xl" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-3 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <RowActionPending />
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
      <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex h-8 min-h-8 flex-1 items-center justify-start gap-6 overflow-x-auto p-[3px]">
          {ADMIN_PRODUCT_TABS.map((tab) => (
            <Skeleton className="h-lh w-20 shrink-0 scale-y-70 text-sm" key={tab} />
          ))}
        </div>
        <div className="shrink-0 pb-3 sm:pb-0">
          <Skeleton className="h-9 w-full rounded-lg sm:w-34" />
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
                <TableHead>
                  <Skeleton className="h-lh w-14 scale-y-70" />
                </TableHead>
                <TableHead />
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

const CreatePageHeaderPending = (): JSX.Element => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <TitlePending />
    <div className="flex items-center gap-3">
      <div className="flex h-9 items-center px-3 text-sm">
        <Skeleton className="h-lh w-12 scale-y-70" />
      </div>
      <Skeleton className="h-9 w-36 rounded-lg" />
    </div>
  </div>
)

const ProductGeneralSectionPending = (): JSX.Element => (
  <Card className="p-5 sm:p-6">
    <Skeleton className="mb-5 h-lh w-40 scale-y-70 text-base" />
    <div className="flex w-full flex-col gap-5">
      <FieldPending />
      <div className="flex w-full flex-col gap-2">
        <Skeleton className="h-lh w-24 scale-y-70 text-sm leading-snug" />
        <Skeleton className="h-30 w-full rounded-lg" />
        <Skeleton className="h-lh w-80 max-w-full scale-y-70 text-xs" />
      </div>
    </div>
  </Card>
)

const FieldSeparatorPending = (): JSX.Element => (
  <div className="relative -my-2 h-5">
    <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
  </div>
)

const ToggleFieldPending = (): JSX.Element => (
  <div className="flex w-full items-start gap-2">
    <div className="flex flex-1 flex-col gap-0.5 leading-snug">
      <Skeleton className="h-lh w-28 scale-y-70 text-sm leading-snug" />
      <Skeleton className="h-lh w-40 scale-y-70 text-xs" />
    </div>
    <SwitchPending />
  </div>
)

const SelectFieldPending = (): JSX.Element => (
  <div className="flex w-full flex-col gap-2">
    <div>
      <Skeleton className="h-lh w-24 scale-y-70 text-sm leading-none" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  </div>
)

const ProductPricingSectionPending = (): JSX.Element => (
  <Card className="p-5 sm:p-6">
    <Skeleton className="mb-5 h-lh w-36 scale-y-70 text-base" />
    <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-start">
      <div className="flex w-fit flex-col gap-2">
        <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-lh w-12 scale-y-70 text-sm leading-snug" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
      <div className="flex-1">
        <SelectFieldPending />
      </div>
    </div>
  </Card>
)

const OrganizationSectionPending = (): JSX.Element => (
  <Card className="p-5 sm:p-6">
    <Skeleton className="mb-4 h-lh w-32 scale-y-70 text-base" />
    <div className="flex w-full flex-col gap-5 sm:flex-row">
      <div className="flex-1">
        <SelectFieldPending />
      </div>
      <div className="flex-1">
        <SelectFieldPending />
      </div>
    </div>
  </Card>
)

export const AdminProductCreatePending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <CreatePageHeaderPending />
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="space-y-6 lg:col-span-2">
        <ProductGeneralSectionPending />
        <ProductPricingSectionPending />
        <Card className="p-5 sm:p-6">
          <Skeleton className="mb-5 h-lh w-36 scale-y-70 text-base" />
          <UploadZonePending />
        </Card>
      </div>
      <div className="space-y-6 lg:col-span-1">
        <Card className="p-5 sm:p-6">
          <Skeleton className="mb-4 h-lh w-16 scale-y-70 text-base" />
          <div className="flex w-full flex-col gap-4">
            <ToggleFieldPending />
            <FieldSeparatorPending />
            <ToggleFieldPending />
          </div>
        </Card>
        <OrganizationSectionPending />
      </div>
    </div>
  </div>
)
