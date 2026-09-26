import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { isRole } from "~/src/integrations/better-auth/auth.access"

import type { User } from "~/src/modules/user/user.types"
import { type UserStatus, getUserInitials, getUserStatus } from "~/src/modules/user/user.utils"

import { useDateFormatter } from "~/src/hooks/use-date-formatter"

import { ADMIN_STATUS_BADGE_CLASSES, USER_STATUS_COLORS } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { UserRowActions } from "~/src/presentation/components/custom/admin/users/row-actions"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type AdminUser = User["select"]

type UserColumn = "createdAt" | "emailVerified" | "role" | "status" | "timezone" | "twoFactorEnabled" | "updatedAt" | "user"

const ColumnHeader = ({ id }: { readonly id: UserColumn }): string => {
  const t = useTranslations("pages.admin.users.table.headers")

  return t(id)
}

const UserCell = ({ row }: CellContext<DataTableFeatures, AdminUser, string>): JSX.Element => {
  const { banned, email, image, name } = row.original

  return (
    <div className="flex items-center gap-3">
      {image !== null && image !== "" && (
        <img
          alt={name}
          className={cn("size-8 shrink-0 rounded-md border border-border object-cover", { "opacity-50 grayscale": banned })}
          height={32}
          src={image}
          width={32}
        />
      )}
      {(image === null || image === "") && (
        <div
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[0.6875rem] font-semibold", {
            "text-foreground": !banned,
            "text-muted-foreground": banned,
          })}
        >
          {getUserInitials(name)}
        </div>
      )}
      <div className="min-w-0">
        <p className={cn("font-medium", { "text-foreground": !banned, "text-muted-foreground line-through": banned })}>{name}</p>
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

const StatusCell = ({ getValue }: CellContext<DataTableFeatures, AdminUser, UserStatus>): JSX.Element => {
  const t = useTranslations("pages.admin.users.filters.status.options")
  const status = getValue()

  return (
    <Badge
      className={cn("gap-1.5 rounded-md px-2 py-0.5 text-[0.6875rem] font-medium", ADMIN_STATUS_BADGE_CLASSES[USER_STATUS_COLORS[status]])}
      variant="outline"
    >
      {t(status)}
    </Badge>
  )
}

const BooleanCell = ({ getValue }: CellContext<DataTableFeatures, AdminUser, boolean>): JSX.Element => {
  const t = useTranslations("pages.admin.users.table.booleans")

  return <span className="text-muted-foreground">{getValue() ? t("yes") : t("no")}</span>
}

const DateCell = ({ getValue, row }: CellContext<DataTableFeatures, AdminUser, Date>): JSX.Element => {
  const { formatDate } = useDateFormatter({ day: "numeric", hour: "numeric", minute: "2-digit", month: "short", year: "numeric" })

  return (
    <span className="text-sm text-muted-foreground" suppressHydrationWarning>
      {formatDate({ timeZone: row.original.timezone, value: getValue() })}
    </span>
  )
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
  columnHelper.display({ cell: UserRowActions, enableSorting: false, header: "", id: "actions" }),
])
