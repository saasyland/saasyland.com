import type { JSX } from "react"

import {
  ADMIN_DASHBOARD_PREVIEW_PAGINATION,
  ADMIN_USER_DETAILS,
  DASHBOARD_COLUMN_SIZES,
  INVITATION_COLUMN_SIZES,
  USER_COLUMN_SIZES,
} from "~/src/data/admin"
import { SETTINGS_TABS } from "~/src/data/auth"
import { ADMIN_DASHBOARD_PANELS, ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"
import { DATA_GRID_ACTIONS_SIZE } from "~/src/data/data-grid"
import { ADMIN_DASHBOARD_ACTIONS } from "~/src/data/navigation"
import { USER_PROFILE_SECTIONS } from "~/src/data/user-profile"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"
import { GridPanelPending } from "~/src/presentation/components/custom/admin/dashboard/grid-panel-pending"
import { RowActionPending } from "~/src/presentation/components/custom/admin/pending-blocks"
import { DataGridPending } from "~/src/presentation/components/custom/data-grid-pending"
import { PreferencesCardPending } from "~/src/presentation/components/custom/preferences-card-pending"
import { EmailCardPending } from "~/src/presentation/components/custom/settings/settings-pending"

export const AdminDashboardPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8 pb-8">
    <AdminPageHeaderPending actions={ADMIN_DASHBOARD_ACTIONS.length} />
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10 lg:grid-cols-3">
      {ADMIN_DASHBOARD_STATS.map((stat) => (
        <div className="flex flex-col gap-4 bg-card p-4 sm:p-5" key={stat.key}>
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-lh w-32 scale-y-70 text-body-sm" />
            <Skeleton className="size-8 rounded-md" />
          </div>
          <Skeleton className="h-lh w-10 scale-y-70 text-headline-support" />
        </div>
      ))}
    </div>
    {ADMIN_DASHBOARD_PANELS.map(({ Pending, key }) => (
      <Pending key={key} />
    ))}
    <GridPanelPending columns={DASHBOARD_USER_PENDING_COLUMNS} isSelectable rows={ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize} />
    <div className="flex justify-end">
      <Skeleton className="h-7 w-26 rounded-md" />
    </div>
  </div>
)

export const AdminSettingsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col">
    <AdminPageHeaderPending tabs={SETTINGS_TABS.length} />
    <div className="mt-8 grid grid-cols-1 items-start gap-6 text-sm lg:grid-cols-2">
      <PreferencesCardPending />
      <EmailCardPending />
    </div>
  </div>
)

const UserPending = (): JSX.Element => (
  <div className="flex items-center gap-3">
    <Skeleton className="size-8 shrink-0 rounded-full" />
    <div className="flex min-w-0 flex-col">
      <Skeleton className="h-lh w-24 scale-y-70" />
      <Skeleton className="h-lh w-40 scale-y-70 text-spec" />
    </div>
  </div>
)

const DASHBOARD_USER_PENDING_COLUMNS = [
  { cell: <UserPending />, id: "user", width: DASHBOARD_COLUMN_SIZES.user },
  { cell: <Skeleton className="h-5.5 w-18 rounded-md" />, id: "role", width: DASHBOARD_COLUMN_SIZES.role },
  { cell: <Skeleton className="h-5.5 w-16 rounded-md" />, id: "status", width: DASHBOARD_COLUMN_SIZES.status },
  { cell: <Skeleton className="h-lh w-20 scale-y-70 text-sm" />, id: "joined", width: DASHBOARD_COLUMN_SIZES.date },
]

const USER_PENDING_COLUMNS = [
  { cell: <UserPending />, id: "user", width: USER_COLUMN_SIZES.user },
  { cell: <Skeleton className="h-lh w-16 scale-y-70 text-sm" />, id: "role", width: USER_COLUMN_SIZES.role },
  { cell: <Skeleton className="h-5.5 w-16 rounded-md" />, id: "status", width: USER_COLUMN_SIZES.status },
  { cell: <Skeleton className="h-lh w-8 scale-y-70 text-sm" />, id: "emailVerified", width: USER_COLUMN_SIZES.emailVerified },
  { cell: <Skeleton className="h-lh w-36 scale-y-70 text-sm" />, id: "createdAt", width: USER_COLUMN_SIZES.createdAt },
] as const

export const AdminUsersAllPending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-0 w-full flex-1 flex-col gap-4">
    <div className="flex justify-end">
      <Skeleton className="h-10 w-25 rounded-md" />
    </div>
    <DataGridPending actionsWidth={DATA_GRID_ACTIONS_SIZE} columns={USER_PENDING_COLUMNS} isSelectable />
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

const INVITATION_PENDING_COLUMNS = [
  { cell: <Skeleton className="h-lh w-44 scale-y-70 text-sm" />, id: "email", width: INVITATION_COLUMN_SIZES.email },
  { cell: <Skeleton className="h-lh w-16 scale-y-70 text-sm" />, id: "role", width: INVITATION_COLUMN_SIZES.role },
  { cell: <Skeleton className="h-5.5 w-18 rounded-md" />, id: "status", width: INVITATION_COLUMN_SIZES.status },
  { cell: <Skeleton className="h-lh w-28 scale-y-70 text-sm" />, id: "invitedBy", width: INVITATION_COLUMN_SIZES.invitedBy },
  { cell: <Skeleton className="h-lh w-20 scale-y-70 text-sm" />, id: "sentAt", width: INVITATION_COLUMN_SIZES.date },
  { cell: <Skeleton className="h-lh w-20 scale-y-70 text-sm" />, id: "expiresAt", width: INVITATION_COLUMN_SIZES.date },
] as const

export const AdminUsersInvitationsPending = (): JSX.Element => (
  <div aria-busy="true" className="flex min-h-0 w-full flex-1 flex-col gap-4">
    <div className="flex justify-end">
      <Skeleton className="h-10 w-34 rounded-md" />
    </div>
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-lh w-44 scale-y-70 text-title" />
        <Skeleton className="mt-0.5 h-lh w-96 max-w-full scale-y-70 text-body-sm" />
      </div>
    </div>
    <DataGridPending actionsWidth={DATA_GRID_ACTIONS_SIZE} columns={INVITATION_PENDING_COLUMNS} isSelectable />
  </div>
)
