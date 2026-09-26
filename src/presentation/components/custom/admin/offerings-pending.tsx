import type { JSX } from "react"

import {
  ADMIN_COURSE_CURRICULUM_SECTIONS,
  ADMIN_COURSE_STATUS_TOGGLES,
  ADMIN_PRICING_MODELS,
  ADMIN_PRICING_STATS,
  ADMIN_PRODUCT_TABS,
} from "~/src/data/admin"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  FieldPending,
  IconPending,
  LongDescriptionPending,
  PAGE_ROWS,
  PaginationPending,
  RowActionPending,
  SwitchPending,
  TitlePending,
  ToggleFieldPending,
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

const CourseGeneralSectionPending = (): JSX.Element => (
  <Card className="p-5 sm:p-6">
    <Skeleton className="mb-5 h-lh w-40 scale-y-70 text-base" />
    <div className="flex w-full flex-col gap-5">
      <FieldPending />
      <div className="flex w-full flex-col gap-2">
        <Skeleton className="h-lh w-24 scale-y-70 text-sm leading-snug" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-xs" />
      </div>
    </div>
  </Card>
)

const FieldSeparatorPending = (): JSX.Element => (
  <div className="relative -my-2 h-5">
    <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
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
        <Skeleton className="h-8 w-44 rounded-lg" />
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

const CoursePricingSectionPending = (): JSX.Element => (
  <Card className="p-5 sm:p-6">
    <Skeleton className="mb-5 h-lh w-36 scale-y-70 text-base" />
    <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-start">
      <div className="flex w-fit flex-col gap-2">
        <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
        <Skeleton className="h-8 w-60 rounded-lg" />
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

export const AdminCourseCreatePending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <CreatePageHeaderPending />
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="space-y-6 lg:col-span-2">
        <CourseGeneralSectionPending />
        <Card className="p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Skeleton className="h-lh w-24 scale-y-70 text-base" />
              <div className="mt-1 flex flex-col text-xs">
                <Skeleton className="h-lh w-64 max-w-full scale-y-70" />
                <Skeleton className="h-lh w-1/4 scale-y-70 sm:hidden" />
              </div>
            </div>
            <div className="flex h-8 items-center px-3 text-sm">
              <Skeleton className="h-lh w-18 scale-y-70" />
            </div>
          </div>
          {ADMIN_COURSE_CURRICULUM_SECTIONS.map((section) => (
            <div className="mb-6" key={section.id}>
              <div className="mb-3 flex items-center">
                <div className="p-1">
                  <IconPending />
                </div>
                <div className="ml-1 flex flex-1 items-center gap-2">
                  <div className="flex size-7 items-center justify-center">
                    <IconPending />
                  </div>
                  <Skeleton className="h-lh w-44 scale-y-70 text-sm" />
                </div>
              </div>
              {section.lessons.length > 0 && (
                <div className="space-y-2 pl-8">
                  {section.lessons.map((lesson) => (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3" key={lesson.id}>
                      <div className="size-4" />
                      <div className="-ml-2 flex flex-1 flex-col text-sm">
                        <Skeleton className="h-lh w-48 max-w-full scale-y-70" />
                        <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
                      </div>
                      <div className="flex items-center gap-3">
                        <IconPending />
                        <IconPending />
                      </div>
                      <div className="ml-2 size-7" />
                    </div>
                  ))}
                  <Skeleton className="mt-2 h-8 w-full rounded-lg" />
                </div>
              )}
            </div>
          ))}
          <Skeleton className="mt-4 h-8 w-full rounded-lg" />
        </Card>
        <CoursePricingSectionPending />
      </div>
      <div className="space-y-6 lg:col-span-1">
        <Card className="p-5 sm:p-6">
          <Skeleton className="mb-4 h-lh w-16 scale-y-70 text-base" />
          <div className="flex w-full flex-col gap-4">
            {ADMIN_COURSE_STATUS_TOGGLES.map((toggle, index) => (
              <div className="flex flex-col gap-4" key={toggle.id}>
                {index > 0 && <FieldSeparatorPending />}
                <ToggleFieldPending />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <Skeleton className="mb-5 h-lh w-40 scale-y-70 text-base" />
          <UploadZonePending />
        </Card>
        <OrganizationSectionPending />
      </div>
    </div>
  </div>
)

export const AdminPricingModelsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8 pb-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <TitlePending />
        <LongDescriptionPending />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="hidden h-9 w-32 rounded-lg sm:block" />
        <Skeleton className="h-9 w-33 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {ADMIN_PRICING_STATS.map((stat) => (
        <Card key={stat.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
              <Skeleton className="h-lh w-18 scale-y-70 text-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 items-start gap-6 pt-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {ADMIN_PRICING_MODELS.map((model) => (
        <Card className="relative flex h-full flex-col gap-0 py-0" key={model.id}>
          {model.isPopular && (
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-2 font-mono text-label sm:px-6">
              <span className="size-1.25 rounded-xs bg-border" />
              <Skeleton className="h-lh w-24 scale-y-70" />
            </div>
          )}
          <CardContent className="flex h-full flex-col p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <Skeleton className="mb-3 h-5 w-26 rounded-4xl" />
                <Skeleton className="h-lh w-28 scale-y-70 text-lg" />
              </div>
              <div className="mt-1">
                <SwitchPending />
              </div>
            </div>
            <div className="mb-6">
              <div className="flex items-baseline gap-1.5">
                <Skeleton className="h-lh w-20 scale-y-70 text-price" />
                <Skeleton className="h-lh w-12 scale-y-70 font-mono text-spec" />
              </div>
              <Skeleton className="mt-2 h-lh w-52 max-w-full scale-y-70 text-body-sm" />
            </div>
            <div className="mb-6 h-px w-full bg-border" />
            <div className="flex-1">
              <Skeleton className="mb-4 h-lh w-28 scale-y-70 font-mono text-label" />
              <div className="space-y-3">
                {model.features.map((feature) => (
                  <div className="flex items-start gap-3" key={feature}>
                    <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                    <Skeleton className="h-lh w-48 scale-y-70 text-sm" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
              <div className="flex items-center gap-2 text-xs">
                <IconPending />
                <Skeleton className="h-lh w-16 scale-y-70" />
              </div>
              <div className="h-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)
