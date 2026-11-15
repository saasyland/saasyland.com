import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import {
  ADMIN_DASHBOARD_CHART_FILTERS,
  ADMIN_DASHBOARD_CHART_MONTHS,
  ADMIN_DASHBOARD_CHART_TICKS,
  ADMIN_DASHBOARD_PREVIEW_PAGINATION,
  ADMIN_SETTINGS_TABS,
} from "~/src/data/admin"
import { ADMIN_INVITATION_ROWS, ADMIN_ROLE_ROWS, ADMIN_USERS_TABS } from "~/src/data/admin-users"
import { ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"
import { ADMIN_DASHBOARD_ACTIONS } from "~/src/data/navigation"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  CheckboxPending,
  DescriptionPending,
  IconPending,
  LongDescriptionPending,
  PAGE_ROWS,
  PaginationPending,
  RowActionPending,
  SortableHeadPending,
  TitlePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"
import { PreferencesCardPending } from "~/src/presentation/components/custom/preferences-card"

import { ROUTES } from "~/src/routes"

const PREVIEW_ROWS = Array.from({ length: ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize }, (_, index) => index)

const DashboardUserRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <CheckboxPending />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-md" />
        <div>
          <Skeleton className="h-lh w-16 scale-y-70" />
          <Skeleton className="h-lh w-100 scale-y-70 text-xs" />
        </div>
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-18 rounded-4xl" />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2 text-xs">
        <Skeleton className="size-2 rounded-full" />
        <Skeleton className="h-lh w-9 scale-y-70" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-19 scale-y-70 text-xs" />
    </TableCell>
    <TableCell>
      <div className="flex items-center justify-end gap-2">
        <div className="flex size-7 items-center justify-center">
          <IconPending />
        </div>
        <div className="flex size-7 items-center justify-center">
          <IconPending />
        </div>
      </div>
    </TableCell>
  </TableRow>
)

const DashboardChartPending = (): JSX.Element => (
  <Card className="gap-0 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Skeleton className="h-lh w-36 scale-y-70 text-title" />
        <Skeleton className="mt-1 h-lh w-80 max-w-full scale-y-70 text-body-sm" />
      </div>
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
        {ADMIN_DASHBOARD_CHART_FILTERS.map((filter) => (
          <Skeleton className="h-7 w-11 rounded-md" key={filter} />
        ))}
      </div>
    </div>
    <div className="relative mt-7 h-70 w-full">
      <div className="absolute top-0 bottom-6 left-0 flex flex-col justify-between font-mono text-[0.6875rem]">
        {ADMIN_DASHBOARD_CHART_TICKS.map((tick) => (
          <Skeleton className="h-lh w-6.5 scale-y-70" key={tick} />
        ))}
      </div>
      <div className="absolute top-2 right-0 bottom-8 left-11 flex flex-col justify-between">
        {ADMIN_DASHBOARD_CHART_TICKS.map((tick) => (
          <div className="h-px w-full bg-border" key={tick} />
        ))}
      </div>
      <div className="absolute right-0 bottom-0 left-11 flex justify-between font-mono text-[0.6875rem]">
        {ADMIN_DASHBOARD_CHART_MONTHS.map((month) => (
          <Skeleton className="h-lh w-5 scale-y-70" key={month.getTime()} />
        ))}
      </div>
    </div>
  </Card>
)

export const AdminDashboardPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8 pb-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <TitlePending />
        <DescriptionPending />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-33 rounded-lg" />
        {ADMIN_DASHBOARD_ACTIONS.map((action) => (
          <Skeleton className="h-9 w-32 rounded-lg" key={action.key} />
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-3">
      {ADMIN_DASHBOARD_STATS.map((stat) => (
        <div className="bg-card px-5 py-5" key={stat.key}>
          <Skeleton className="h-lh w-32 scale-y-70 font-mono text-label" />
          <Skeleton className="mt-3 h-lh w-10 scale-y-70 text-headline-support" />
        </div>
      ))}
    </div>
    <DashboardChartPending />
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-lh w-36 scale-y-70 text-title" />
          <div className="mt-0.5 flex flex-col text-body-sm">
            <Skeleton className="h-lh w-100 max-w-full scale-y-70" />
            <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
          </div>
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-8 w-full rounded-lg sm:w-48" />
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
              <TableHead>
                <Skeleton className="h-lh w-12 scale-y-70" />
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
        <Skeleton className="h-7 w-26 rounded-lg" />
      </div>
    </Card>
  </div>
)

const ProfileCardHeaderPending = (): JSX.Element => (
  <CardHeader className="border-b border-border p-5">
    <Skeleton className="mb-1 h-lh w-36 scale-y-70 text-base" />
    <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-xs" />
  </CardHeader>
)

const SettingsFieldPending = (): JSX.Element => (
  <div className="flex w-full flex-col gap-2">
    <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
    <Skeleton className="h-8 w-full rounded-lg" />
  </div>
)

export const AdminSettingsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div>
      <TitlePending />
      <LongDescriptionPending />
    </div>
    <div className="flex w-full flex-col gap-2">
      <div className="border-b border-border">
        <div className="no-scrollbar flex h-8 w-full items-center justify-start gap-6 overflow-x-auto p-[3px]">
          {ADMIN_SETTINGS_TABS.map((tab) => (
            <Skeleton className="h-lh w-18 shrink-0 scale-y-70 text-sm" key={tab} />
          ))}
        </div>
      </div>
      <div className="mt-8 space-y-6 text-sm">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <ProfileCardHeaderPending />
            <CardContent className="flex-1 space-y-6 p-5">
              <div className="flex items-center gap-6">
                <Skeleton className="size-16 shrink-0 rounded-xl" />
                <div>
                  <div className="mb-2 flex gap-3">
                    <Skeleton className="h-8 w-22 rounded-lg" />
                    <Skeleton className="h-8 w-18 rounded-lg" />
                  </div>
                  <div className="flex flex-col text-xs">
                    <Skeleton className="h-lh w-60 max-w-full scale-y-70" />
                    <Skeleton className="h-lh w-10 scale-y-70 sm:hidden" />
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <SettingsFieldPending />
                  <SettingsFieldPending />
                </div>
                <div className="flex w-full flex-col gap-2">
                  <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-lh w-72 max-w-full scale-y-70 text-xs" />
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end border-t border-border bg-muted/40 p-4">
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </Card>
          <PreferencesCardPending />
        </div>
        <Card className="overflow-hidden border-destructive/20 bg-destructive/5">
          <CardHeader className="border-b border-destructive/10 p-5">
            <Skeleton className="mb-1 h-lh w-28 scale-y-70 text-base" />
            <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-xs" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Skeleton className="mb-1 h-lh w-36 scale-y-70 text-sm" />
              <div className="flex flex-col text-xs">
                <Skeleton className="h-lh w-96 max-w-full scale-y-70" />
                <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
              </div>
            </div>
            <Skeleton className="h-8 w-full shrink-0 rounded-lg sm:w-36" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)

const SearchFilterPending = (): JSX.Element => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div className="relative flex-1">
      <Skeleton className="h-10 w-full rounded-lg" />
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
        <Skeleton className="size-8 shrink-0 rounded-md" />
        <div>
          <Skeleton className="h-lh w-16 scale-y-70" />
          <Skeleton className="h-lh w-100 scale-y-70 text-xs" />
        </div>
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-14 scale-y-70" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-13 rounded-md" />
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
      <Skeleton className="h-10 w-25 rounded-lg" />
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

export const AdminUsersInvitationsPending = (): JSX.Element => (
  <div aria-busy="true" className="space-y-6">
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Skeleton className="h-10 w-26 rounded-lg" />
      <Skeleton className="h-10 w-28 rounded-lg" />
    </div>
    <SearchFilterPending />
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead>
              <Skeleton className="h-lh w-8 scale-y-70" />
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead>
              <Skeleton className="h-lh w-16 scale-y-70" />
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ADMIN_INVITATION_ROWS.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>
                <Skeleton className="h-lh w-40 scale-y-70 text-sm" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-lh w-20 scale-y-70" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-16 rounded-4xl" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-lh w-20 scale-y-70" />
              </TableCell>
              <TableCell>
                <RowActionPending />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <PaginationPending />
  </div>
)

export const AdminUsersRolesPending = (): JSX.Element => (
  <div aria-busy="true" className="space-y-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <TitlePending />
        <LongDescriptionPending />
      </div>
      <Skeleton className="h-9 w-full rounded-lg sm:w-29" />
    </div>
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-lh w-16 scale-y-70" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-lh w-20 scale-y-70" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-lh w-8 scale-y-70" />
            </TableHead>
            <TableHead>
              <SortableHeadPending />
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ADMIN_ROLE_ROWS.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-lh w-96 scale-y-70 text-sm" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-15 rounded-4xl" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-lh w-14 scale-y-70 text-sm" />
              </TableCell>
              <TableCell>
                <RowActionPending />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <PaginationPending />
  </div>
)

export const AdminUsersSecurityPending = (): JSX.Element => (
  <div aria-busy="true" className="mt-6">
    <Skeleton className="h-lh w-36 scale-y-70 text-sm" />
  </div>
)

const ADMIN_USERS_PAGES = new Map<string, () => JSX.Element>([
  [ROUTES.ADMIN_USERS, AdminUsersAllPending],
  [ROUTES.ADMIN_USERS_ALL, AdminUsersAllPending],
  [ROUTES.ADMIN_USERS_INVITATIONS, AdminUsersInvitationsPending],
  [ROUTES.ADMIN_USERS_ROLES, AdminUsersRolesPending],
  [ROUTES.ADMIN_USERS_SECURITY, AdminUsersSecurityPending],
])

export const AdminUsersPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = ADMIN_USERS_PAGES.get(pathname)

  return (
    <div className="-mx-4 -mt-5 -mb-6 flex min-h-0 w-[calc(100%+2rem)] flex-1 flex-col overflow-hidden md:-mx-6 md:-mt-7 md:-mb-8 md:w-[calc(100%+3rem)]">
      <div className="shrink-0 border-b border-border bg-muted/30 px-4 pt-5 md:px-6 md:pt-7">
        <div className="mb-6">
          <TitlePending />
          <div className="mt-0.5 flex flex-col text-body-sm">
            <Skeleton className="h-lh w-104 max-w-full scale-y-70" />
            <Skeleton className="h-lh w-1/3 scale-y-70 sm:hidden" />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <div className="border-b border-border">
            <div className="no-scrollbar flex h-8 w-fit max-w-full items-center justify-start gap-6 overflow-x-auto p-[3px]">
              {ADMIN_USERS_TABS.map((tab) => (
                <Skeleton className="h-lh w-20 shrink-0 scale-y-70 text-sm" key={tab.id} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-5 md:px-6 md:pt-6">{Page && <Page />}</div>
    </div>
  )
}
