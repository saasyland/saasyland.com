import { type JSX, useMemo } from "react"

import { Link } from "@tanstack/react-router"
import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { USER_STATUSES } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { type UserStatus, getUserInitials, getUserStatus } from "~/src/modules/user/user.utils"

import { DASHBOARD_COLUMN_SIZES, USER_STATUS_BADGES } from "~/src/data/admin"

import { Avatar, AvatarFallback, AvatarImage } from "~/src/presentation/components/shadcn/avatar"
import { Badge } from "~/src/presentation/components/shadcn/badge"

import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type DashboardUser = User["select"]

export const DASHBOARD_USER_GRID_ID = "dashboard-users"

const UserCell = ({ row }: CellContext<DataGridFeatures, DashboardUser, string>): JSX.Element => (
  <div className="flex min-w-0 items-center gap-3">
    <Avatar className="size-8 border border-border">
      {row.original.image !== null && <AvatarImage alt={row.original.name} src={row.original.image} />}
      <AvatarFallback className="bg-muted text-label font-semibold text-foreground">{getUserInitials(row.original.name)}</AvatarFallback>
    </Avatar>
    <div className="flex min-w-0 flex-col">
      <Link
        className="truncate rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        params={{ userId: row.original.id }}
        to="/admin/users/$userId"
      >
        {row.original.name}
      </Link>
      <span className="truncate text-spec text-muted-foreground">{row.original.email}</span>
    </div>
  </div>
)

const RoleCell = ({ getValue }: CellContext<DataGridFeatures, DashboardUser, DashboardUser["role"]>): JSX.Element => (
  <Badge>{getValue()}</Badge>
)

const StatusCell = ({ getValue }: CellContext<DataGridFeatures, DashboardUser, UserStatus>): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard.users.table.status")

  return <Badge variant={USER_STATUS_BADGES[getValue()]}>{t(getValue())}</Badge>
}

const JoinedCell = ({ getValue }: CellContext<DataGridFeatures, DashboardUser, Date>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-muted-foreground">{format.dateTime(getValue(), "date")}</span>
}

const columnHelper = createColumnHelper<DataGridFeatures, DashboardUser>()

export const useDashboardUserColumns = (): DataGridColumn<DashboardUser>[] => {
  const t = useTranslations("pages.admin.dashboard.users.table")

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          cell: UserCell,
          header: t("columns.user"),
          id: "user",
          meta: { export: ({ email, name }) => `${name} <${email}>`, filter: { kind: DATA_GRID_FILTER.TEXT }, pinned: DATA_GRID_PIN.START },
          size: DASHBOARD_COLUMN_SIZES.user,
        }),
        columnHelper.accessor("role", { cell: RoleCell, header: t("columns.role"), size: DASHBOARD_COLUMN_SIZES.role }),
        columnHelper.accessor((row) => getUserStatus(row), {
          cell: StatusCell,
          header: t("columns.status"),
          id: "status",
          meta: {
            export: (row) => t(`status.${getUserStatus(row)}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: USER_STATUSES.map((value) => ({ label: t(`status.${value}`), value })),
            },
          },
          size: DASHBOARD_COLUMN_SIZES.status,
        }),
        columnHelper.accessor("createdAt", {
          cell: JoinedCell,
          header: t("columns.joined"),
          id: "joined",
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: DASHBOARD_COLUMN_SIZES.date,
          sortFn: "datetime",
        }),
      ]),
    [t],
  )
}
