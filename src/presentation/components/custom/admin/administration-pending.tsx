import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import {
  ADMIN_INVITATION_ROWS,
  ADMIN_PAYMENTS_TABS,
  ADMIN_PAYMENT_ROWS,
  ADMIN_REFUND_TRENDING_STATS,
  ADMIN_ROLE_ROWS,
  ADMIN_SETTINGS_TABS,
  ADMIN_USERS_TABS,
} from "~/src/data/admin"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  CheckboxPending,
  IconPending,
  LongDescriptionPending,
  PAGE_ROWS,
  PaginationPending,
  RowActionPending,
  SortableHeadPending,
  TitlePending,
  ToggleFieldPending,
} from "~/src/presentation/components/custom/admin/pending-blocks"

import { ROUTES } from "~/src/routes"

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

const StatCardPending = (): JSX.Element => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
      <IconPending />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-lh w-32 scale-y-70 text-headline-support" />
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <Skeleton className="h-lh w-28 scale-y-70" />
      </div>
    </CardContent>
  </Card>
)

const TrendingStatCardPending = (): JSX.Element => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
      <IconPending />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-lh w-32 scale-y-70 text-headline-support" />
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <Skeleton className="size-3.5" />
        <Skeleton className="h-lh w-10 scale-y-70" />
        <Skeleton className="ml-1 h-lh w-20 scale-y-70" />
      </div>
    </CardContent>
  </Card>
)

const RefundRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <div className="flex flex-col">
          <Skeleton className="h-lh w-24 scale-y-70 text-sm" />
          <Skeleton className="h-lh w-28 scale-y-70 text-xs" />
        </div>
      </div>
    </TableCell>
    <TableCell>
      <div className="flex flex-col">
        <Skeleton className="h-lh w-14 scale-y-70 text-sm" />
        <Skeleton className="h-lh w-18 scale-y-70 text-xs" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-20 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-36 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-lh w-22 scale-y-70 text-sm" />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2 text-sm">
        <Skeleton className="size-1.5 rounded-full" />
        <Skeleton className="h-lh w-17 scale-y-70" />
      </div>
    </TableCell>
    <TableCell>
      <RowActionPending />
    </TableCell>
  </TableRow>
)

export const AdminPaymentsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div>
      <TitlePending />
      <Skeleton className="mt-1 h-lh w-96 max-w-full scale-y-70 text-sm" />
    </div>
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex h-8 min-h-8 flex-1 items-center justify-start gap-6 overflow-x-auto p-[3px]">
          {ADMIN_PAYMENTS_TABS.map((tab) => (
            <Skeleton className="h-lh w-18 shrink-0 scale-y-70 text-sm" key={tab} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-3 sm:pb-0">
          <Skeleton className="h-9 w-21 rounded-lg" />
          <Skeleton className="h-9 w-38 rounded-lg" />
        </div>
      </div>
      <div className="mt-6 space-y-6 text-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {ADMIN_REFUND_TRENDING_STATS.map((stat) => (
            <TrendingStatCardPending key={stat.id} />
          ))}
          <StatCardPending />
        </div>
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-lh w-32 scale-y-70 text-base" />
            <div className="flex size-8 items-center justify-center">
              <IconPending />
            </div>
          </div>
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeadPending />
                  </TableHead>
                  <TableHead>
                    <SortableHeadPending />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-lh w-20 scale-y-70" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-lh w-12 scale-y-70" />
                  </TableHead>
                  <TableHead>
                    <SortableHeadPending />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-lh w-11 scale-y-70" />
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ADMIN_PAYMENT_ROWS.map((payment) => (
                  <RefundRowPending key={payment.id} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <PaginationPending />
        </Card>
      </div>
    </div>
  </div>
)

const ProfileCardHeaderPending = (): JSX.Element => (
  <CardHeader className="border-b border-border p-5">
    <Skeleton className="mb-1 h-lh w-36 scale-y-70 text-base" />
    <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-xs" />
  </CardHeader>
)

const PreferencesCardHeaderPending = (): JSX.Element => (
  <CardHeader className="border-b border-border p-5">
    <Skeleton className="mb-1 h-lh w-28 scale-y-70 text-base" />
    <div className="flex flex-col text-xs">
      <Skeleton className="h-lh w-84 max-w-full scale-y-70" />
      <Skeleton className="h-lh w-1/5 scale-y-70 sm:hidden" />
    </div>
  </CardHeader>
)

const SettingsFieldPending = (): JSX.Element => (
  <div className="flex w-full flex-col gap-2">
    <Skeleton className="h-lh w-24 scale-y-70 text-xs" />
    <Skeleton className="h-8 w-full rounded-lg" />
  </div>
)

const SettingsSelectFieldPending = (): JSX.Element => (
  <div className="flex w-full flex-col gap-2">
    <div>
      <Skeleton className="h-lh w-16 scale-y-70 text-xs" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
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
          <Card className="overflow-hidden">
            <PreferencesCardHeaderPending />
            <CardContent className="flex-1 p-5">
              <div className="flex w-full flex-col gap-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <SettingsSelectFieldPending />
                  <SettingsSelectFieldPending />
                </div>
                <div className="py-2">
                  <ToggleFieldPending />
                </div>
              </div>
            </CardContent>
          </Card>
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
