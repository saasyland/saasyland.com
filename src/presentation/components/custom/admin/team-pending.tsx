import type { JSX } from "react"

import { ADMIN_INVITATION_ROWS, ADMIN_ROLE_ROWS } from "~/src/data/admin-team"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  LongDescriptionPending,
  PaginationPending,
  RowActionPending,
  SortableHeadPending,
  TitlePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"

export const AdminUsersInvitationsPending = (): JSX.Element => (
  <div aria-busy="true" className="space-y-6">
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Skeleton className="h-10 w-26 rounded-lg" />
      <Skeleton className="h-10 w-28 rounded-lg" />
    </div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Skeleton className="h-10 w-full rounded-lg" />
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
