import type { JSX } from "react"

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION, ADMIN_USER_DETAILS } from "~/src/data/admin"
import { ADMIN_DASHBOARD_PANELS, ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"
import { ADMIN_DASHBOARD_ACTIONS } from "~/src/data/navigation"
import { USER_PROFILE_SECTIONS } from "~/src/data/user-profile"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  CheckboxPending,
  DescriptionPending,
  LongDescriptionPending,
  PAGE_ROWS,
  PaginationPending,
  RowActionPending,
  SortableHeadPending,
  TitlePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"
import { PreferencesCardPending } from "~/src/presentation/components/custom/preferences-card-pending"
import { EmailCardPending, SettingsTabsPending } from "~/src/presentation/components/custom/settings/settings-pending"

const PREVIEW_ROWS = Array.from({ length: ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize }, (_, index) => index)

const DashboardUserRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <CheckboxPending />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div>
          <Skeleton className="h-lh w-16 scale-y-70" />
          <Skeleton className="h-lh w-100 scale-y-70 text-spec" />
        </div>
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-5.5 w-18 rounded-md" />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2 text-spec">
        <Skeleton className="size-2 rounded-full" />
        <Skeleton className="h-lh w-9 scale-y-70" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-19 scale-y-70 text-spec" />
    </TableCell>
  </TableRow>
)

export const AdminDashboardPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8 pb-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <TitlePending />
        <DescriptionPending />
      </div>
      <div className="flex items-center gap-3">
        {ADMIN_DASHBOARD_ACTIONS.map((action) => (
          <Skeleton className="h-9 w-32 rounded-md" key={action.key} />
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10 sm:grid-cols-3">
      {ADMIN_DASHBOARD_STATS.map((stat) => (
        <div className="bg-card px-5 py-5" key={stat.key}>
          <Skeleton className="h-lh w-32 scale-y-70 text-label" />
          <Skeleton className="mt-3 h-lh w-10 scale-y-70 text-headline-support" />
        </div>
      ))}
    </div>
    {ADMIN_DASHBOARD_PANELS.map(({ Pending, key }) => (
      <Pending key={key} />
    ))}
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <Skeleton className="h-lh w-36 scale-y-70 text-title" />
        <div className="mt-0.5 flex flex-col text-body-sm">
          <Skeleton className="h-lh w-100 max-w-full scale-y-70" />
          <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-8 w-full rounded-md sm:w-48" />
      </div>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <CheckboxPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
              <TableHead>
                <SortableHeadPending />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PREVIEW_ROWS.map((row) => (
              <DashboardUserRowPending key={row} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <PaginationPending />
      <div className="flex justify-end">
        <Skeleton className="h-7 w-26 rounded-md" />
      </div>
    </Card>
  </div>
)

export const AdminSettingsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div>
      <TitlePending />
      <LongDescriptionPending />
    </div>
    <div className="flex w-full flex-col gap-2">
      <SettingsTabsPending />
      <div className="mt-8 grid grid-cols-1 items-start gap-6 text-sm lg:grid-cols-2">
        <PreferencesCardPending />
        <EmailCardPending />
      </div>
    </div>
  </div>
)

const UserRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <CheckboxPending />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div>
          <Skeleton className="h-lh w-16 scale-y-70" />
          <Skeleton className="h-lh w-100 scale-y-70 text-spec" />
        </div>
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-14 scale-y-70" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5.5 w-13 rounded-md" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-7 scale-y-70" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-5 scale-y-70" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-8 scale-y-70" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-37 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-37 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <RowActionPending />
    </TableCell>
  </TableRow>
)

export const AdminUsersAllPending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-0 w-full flex-1 flex-col gap-4">
    <div className="flex justify-end">
      <Skeleton className="h-10 w-25 rounded-md" />
    </div>
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <CheckboxPending />
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-lh w-24 scale-y-70" />
                <Skeleton className="size-3.5" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-lh w-21 scale-y-70" />
                <Skeleton className="size-3.5" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-lh w-34 scale-y-70" />
                <Skeleton className="size-3.5" />
              </div>
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {PAGE_ROWS.map((row) => (
            <UserRowPending key={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <PaginationPending />
  </div>
)

export const AdminUserProfilePending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-0 w-full flex-1 flex-col gap-6 pb-6">
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <Skeleton className="size-12 shrink-0 rounded-full" />
        <div className="min-w-0">
          <Skeleton className="h-lh w-40 scale-y-70 text-title" />
          <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-sm" />
        </div>
      </div>
      <RowActionPending />
    </div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-lh w-20 scale-y-70 text-base leading-snug" />
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border text-sm">
              {ADMIN_USER_DETAILS.map((detail) => (
                <div className="flex items-center justify-between gap-4 py-2.5" key={detail}>
                  <Skeleton className="h-lh w-28 scale-y-70" />
                  <Skeleton className="h-lh w-20 scale-y-70" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {USER_PROFILE_SECTIONS.map(({ key, Pending }) => (
          <Pending key={key} />
        ))}
      </div>
      <Card>
        <CardHeader className="border-b">
          <Skeleton className="h-lh w-20 scale-y-70 text-base leading-snug" />
          <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-sm" />
        </CardHeader>
        <CardContent className="px-0">
          <div className="flex items-center gap-3 px-(--card-spacing) py-3">
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <div className="min-w-0">
              <Skeleton className="h-lh w-48 max-w-full scale-y-70 text-sm" />
              <Skeleton className="h-lh w-40 max-w-full scale-y-70 text-spec" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
)
