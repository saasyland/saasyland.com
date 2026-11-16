import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import type { User } from "~/src/modules/user/user.types"
import { type UserStatus, getUserInitials, getUserStatus } from "~/src/modules/user/user.utils"

import { ADMIN_STATUS_DOT_CLASSES, USER_STATUS_COLORS } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Avatar, AvatarFallback, AvatarImage } from "~/src/presentation/components/shadcn/avatar"
import { Badge } from "~/src/presentation/components/shadcn/badge"

import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type DashboardUser = User["select"]

const ColumnHeader = ({ id }: { readonly id: "lastActive" | "role" | "status" | "user" }): string => {
  const t = useTranslations("pages.admin.dashboard.users.table.columns")

  return t(id)
}

const StatusCell = ({ getValue }: CellContext<DataTableFeatures, DashboardUser, UserStatus>): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard.users.table.status")
  const status = getValue()

  return (
    <div className="flex items-center gap-2">
      <div className={cn("size-2 rounded-full", ADMIN_STATUS_DOT_CLASSES[USER_STATUS_COLORS[status]])} />
      <span className="text-xs text-muted-foreground">{t(status)}</span>
    </div>
  )
}

const LastActiveCell = ({ getValue }: CellContext<DataTableFeatures, DashboardUser, Date>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-xs text-muted-foreground">{format.dateTime(getValue(), "date")}</span>
}

const columnHelper = createColumnHelper<DataTableFeatures, DashboardUser>()

export const dashboardUserColumns = columnHelper.columns([
  columnHelper.accessor("name", {
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-8 rounded-md border border-border">
          {row.original.image !== null && <AvatarImage alt={row.original.name} src={row.original.image} />}
          <AvatarFallback className="rounded-md bg-muted text-[0.6875rem] font-semibold text-foreground">
            {getUserInitials(row.original.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <Link
            className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            params={{ userId: row.original.id }}
            to="/admin/users/$userId"
          >
            {row.original.name}
          </Link>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
    header: () => <ColumnHeader id="user" />,
    id: "user",
  }),
  columnHelper.accessor("role", {
    cell: ({ getValue }) => (
      <Badge variant="outline" className="font-medium text-muted-foreground">
        {getValue()}
      </Badge>
    ),
    header: () => <ColumnHeader id="role" />,
  }),
  columnHelper.accessor((row) => getUserStatus(row), {
    cell: StatusCell,
    header: () => <ColumnHeader id="status" />,
    id: "status",
  }),
  columnHelper.accessor("updatedAt", {
    cell: LastActiveCell,
    header: () => <ColumnHeader id="lastActive" />,
    id: "lastActive",
    sortFn: "datetime",
  }),
])
