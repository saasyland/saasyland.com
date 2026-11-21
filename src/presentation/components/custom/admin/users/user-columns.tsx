import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { isRole } from "~/src/integrations/better-auth/auth.roles"

import type { User } from "~/src/modules/user/user.types"
import { type UserStatus, getUserInitials, getUserStatus } from "~/src/modules/user/user.utils"

import { cn } from "~/src/lib/cn"

import { UserRowActions } from "~/src/presentation/components/custom/admin/users/row-actions"
import { UserStatusBadge } from "~/src/presentation/components/custom/admin/users/user-status-badge"
import { DataTableActionsHeader, type DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type AdminUser = User["select"]

type UserColumn = "createdAt" | "emailVerified" | "role" | "status" | "timezone" | "twoFactorEnabled" | "updatedAt" | "user"

const ColumnHeader = ({ id }: { readonly id: UserColumn }): string => {
  const t = useTranslations("pages.admin.users.table.headers")

  return t(id)
}

const UserCell = ({ row }: CellContext<DataTableFeatures, AdminUser, string>): JSX.Element => {
  const { banned, email, id, image, name } = row.original

  return (
    <div className="flex items-center gap-3">
      {image !== null && image !== "" && (
        <img
          alt={name}
          className={cn("size-8 shrink-0 rounded-full border border-border object-cover", { "opacity-50 grayscale": banned })}
          height={32}
          src={image}
          width={32}
        />
      )}
      {(image === null || image === "") && (
        <div
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-semibold", {
            "text-foreground": !banned,
            "text-muted-foreground": banned,
          })}
        >
          {getUserInitials(name)}
        </div>
      )}
      <div className="min-w-0">
        <Link
          className={cn(
            "rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            { "text-foreground": !banned, "text-muted-foreground line-through": banned },
          )}
          params={{ userId: id }}
          to="/admin/users/$userId"
        >
          {name}
        </Link>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  )
}

const RoleCell = ({ getValue }: CellContext<DataTableFeatures, AdminUser, string>): JSX.Element => {
  const t = useTranslations("pages.admin.users.filters.role.options")
  const role = getValue()

  return <span className="text-muted-foreground">{isRole(role) ? t(role) : role}</span>
}

const StatusCell = ({ getValue }: CellContext<DataTableFeatures, AdminUser, UserStatus>): JSX.Element => (
  <UserStatusBadge status={getValue()} />
)

const BooleanCell = ({ getValue }: CellContext<DataTableFeatures, AdminUser, boolean>): JSX.Element => {
  const t = useTranslations("pages.admin.users.table.booleans")

  return <span className="text-muted-foreground">{getValue() ? t("yes") : t("no")}</span>
}

const DateCell = ({ getValue }: CellContext<DataTableFeatures, AdminUser, Date>): JSX.Element => {
  const t = useTranslations("common")

  return <span className="text-sm text-muted-foreground">{t("dateTime", { value: getValue() })}</span>
}

const columnHelper = createColumnHelper<DataTableFeatures, AdminUser>()

export const userColumns = columnHelper.columns([
  columnHelper.accessor("name", { cell: UserCell, header: () => <ColumnHeader id="user" />, id: "user" }),
  columnHelper.accessor("role", { cell: RoleCell, header: () => <ColumnHeader id="role" /> }),
  columnHelper.accessor((row) => getUserStatus(row), { cell: StatusCell, header: () => <ColumnHeader id="status" />, id: "status" }),
  columnHelper.accessor("emailVerified", { cell: BooleanCell, header: () => <ColumnHeader id="emailVerified" /> }),
  columnHelper.accessor("twoFactorEnabled", { cell: BooleanCell, header: () => <ColumnHeader id="twoFactorEnabled" /> }),
  columnHelper.accessor("timezone", {
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
    header: () => <ColumnHeader id="timezone" />,
  }),
  columnHelper.accessor("createdAt", { cell: DateCell, header: () => <ColumnHeader id="createdAt" />, sortFn: "datetime" }),
  columnHelper.accessor("updatedAt", { cell: DateCell, header: () => <ColumnHeader id="updatedAt" />, sortFn: "datetime" }),
  columnHelper.display({ cell: UserRowActions, enableSorting: false, header: DataTableActionsHeader, id: "actions" }),
])
