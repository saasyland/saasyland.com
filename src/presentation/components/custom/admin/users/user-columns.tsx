import { type JSX, useMemo } from "react"

import { Link } from "@tanstack/react-router"
import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { ROLE_VALUES, isRole } from "~/src/integrations/better-auth/auth.roles"
import { DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { FLAG_FILTERS } from "~/src/modules/_core/utils/pagination"
import { TIMEZONE_CODES, USER_STATUSES } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { type UserStatus, getUserInitials, getUserStatus } from "~/src/modules/user/user.utils"

import { USER_COLUMN_SIZES } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { UserStatusBadge } from "~/src/presentation/components/custom/admin/users/user-status-badge"
import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type AdminUser = User["select"]

export const USER_GRID_ID = "users"

const UserCell = ({ row }: CellContext<DataGridFeatures, AdminUser, string>): JSX.Element => {
  const { banned, email, id, image, name } = row.original

  return (
    <div className="flex min-w-0 items-center gap-3">
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
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-label font-semibold", {
            "text-foreground": !banned,
            "text-muted-foreground": banned,
          })}
        >
          {getUserInitials(name)}
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <Link
          className={cn(
            "truncate rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            { "text-foreground": !banned, "text-muted-foreground line-through": banned },
          )}
          params={{ userId: id }}
          to="/admin/users/$userId"
        >
          {name}
        </Link>
        <span className="truncate text-spec text-muted-foreground">{email}</span>
      </div>
    </div>
  )
}

const RoleCell = ({ getValue }: CellContext<DataGridFeatures, AdminUser, AdminUser["role"]>): JSX.Element => {
  const t = useTranslations("pages.admin.users.filters.role.options")
  const role = getValue()

  return <span className="text-sm text-muted-foreground">{isRole(role) ? t(role) : role}</span>
}

const StatusCell = ({ getValue }: CellContext<DataGridFeatures, AdminUser, UserStatus>): JSX.Element => (
  <UserStatusBadge status={getValue()} />
)

const BooleanCell = ({ getValue }: CellContext<DataGridFeatures, AdminUser, boolean>): JSX.Element => {
  const t = useTranslations("pages.admin.users.table.booleans")

  return <span className="text-sm text-muted-foreground">{getValue() ? t("yes") : t("no")}</span>
}

const TimezoneCell = ({ getValue }: CellContext<DataGridFeatures, AdminUser, AdminUser["timezone"]>): JSX.Element => (
  <span className="text-sm text-muted-foreground">{getValue()}</span>
)

const DateCell = ({ getValue }: CellContext<DataGridFeatures, AdminUser, Date>): JSX.Element => {
  const t = useTranslations("common")

  return <span className="text-sm text-muted-foreground">{t("dateTime", { value: getValue() })}</span>
}

const columnHelper = createColumnHelper<DataGridFeatures, AdminUser>()

export const useUserColumns = (): DataGridColumn<AdminUser>[] => {
  const t = useTranslations("pages.admin.users")

  return useMemo(() => {
    const flag = (value: boolean): string => t(value ? "table.booleans.yes" : "table.booleans.no")
    const flagOptions = FLAG_FILTERS.map((value) => ({ label: t(`table.booleans.${value}`), value }))

    return columnHelper.columns([
      columnHelper.accessor("name", {
        cell: UserCell,
        header: t("table.headers.user"),
        id: "user",
        meta: { export: ({ email, name }) => `${name} <${email}>`, filter: { kind: DATA_GRID_FILTER.TEXT }, pinned: DATA_GRID_PIN.START },
        size: USER_COLUMN_SIZES.user,
      }),
      columnHelper.accessor("role", {
        cell: RoleCell,
        header: t("table.headers.role"),
        meta: {
          export: ({ role }) => (isRole(role) ? t(`filters.role.options.${role}`) : role),
          filter: {
            kind: DATA_GRID_FILTER.MULTI_SELECT,
            options: ROLE_VALUES.map((value) => ({ label: t(`filters.role.options.${value}`), value })),
          },
        },
        size: USER_COLUMN_SIZES.role,
      }),
      columnHelper.accessor((row) => getUserStatus(row), {
        cell: StatusCell,
        header: t("table.headers.status"),
        id: "status",
        meta: {
          export: (row) => t(`filters.status.options.${getUserStatus(row)}`),
          filter: {
            kind: DATA_GRID_FILTER.MULTI_SELECT,
            options: USER_STATUSES.map((value) => ({ label: t(`filters.status.options.${value}`), value })),
          },
        },
        size: USER_COLUMN_SIZES.status,
      }),
      columnHelper.accessor("emailVerified", {
        cell: BooleanCell,
        header: t("table.headers.emailVerified"),
        meta: { export: ({ emailVerified }) => flag(emailVerified), filter: { kind: DATA_GRID_FILTER.SELECT, options: flagOptions } },
        size: USER_COLUMN_SIZES.emailVerified,
      }),
      columnHelper.accessor("twoFactorEnabled", {
        cell: BooleanCell,
        header: t("table.headers.twoFactorEnabled"),
        meta: {
          export: ({ twoFactorEnabled }) => flag(twoFactorEnabled),
          filter: { kind: DATA_GRID_FILTER.SELECT, options: flagOptions },
          hidden: true,
        },
        size: USER_COLUMN_SIZES.twoFactorEnabled,
      }),
      columnHelper.accessor("timezone", {
        cell: TimezoneCell,
        header: t("table.headers.timezone"),
        meta: {
          filter: { kind: DATA_GRID_FILTER.MULTI_SELECT, options: TIMEZONE_CODES.map((value) => ({ label: value, value })) },
          hidden: true,
        },
        size: USER_COLUMN_SIZES.timezone,
      }),
      columnHelper.accessor("createdAt", {
        cell: DateCell,
        header: t("table.headers.createdAt"),
        meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
        size: USER_COLUMN_SIZES.createdAt,
      }),
      columnHelper.accessor("updatedAt", {
        cell: DateCell,
        header: t("table.headers.updatedAt"),
        meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE }, hidden: true },
        size: USER_COLUMN_SIZES.updatedAt,
      }),
    ])
  }, [t])
}
