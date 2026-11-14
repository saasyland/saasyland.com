import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { ADMIN_INVITATION_ROWS, ADMIN_ROLE_ROWS, ADMIN_USERS_TABS } from "~/src/data/admin-users"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  CheckboxPending,
  LongDescriptionPending,
  PAGE_ROWS,
  PaginationPending,
  RowActionPending,
  SortableHeadPending,
  TitlePending,
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
