import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { type ADMIN_ROLE_ROWS, ADMIN_STATUS_BADGE_CLASSES } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { RowActionsCell } from "~/src/presentation/components/custom/admin/row-actions-cell"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type Role = (typeof ADMIN_ROLE_ROWS)[number]

const ColumnHeader = ({ id }: { readonly id: "description" | "name" | "type" | "users" }): string => {
  const t = useTranslations("pages.admin.users.roles.table.headers")

  return t(id)
}

const NameCell = ({ row }: CellContext<DataTableFeatures, Role, string>): JSX.Element => {
  const t = useTranslations("pages.admin.users.demo.roles")

  return <span className="text-sm font-medium text-foreground">{t(`${row.original.id}.name`)}</span>
}

const DescriptionCell = ({ row }: CellContext<DataTableFeatures, Role, string>): JSX.Element => {
  const t = useTranslations("pages.admin.users.demo.roles")

  return <span className="block max-w-sm truncate text-sm text-muted-foreground">{t(`${row.original.id}.description`)}</span>
}

const TypeCell = ({ row }: CellContext<DataTableFeatures, Role, string>): JSX.Element => {
  const t = useTranslations("pages.admin.users.demo.roles")

  return (
    <Badge className={cn("px-2 py-1 text-xs font-medium", ADMIN_STATUS_BADGE_CLASSES.neutral)} variant="outline">
      {t(`${row.original.id}.type`)}
    </Badge>
  )
}

const UsersCountCell = ({ getValue }: CellContext<DataTableFeatures, Role, number>): JSX.Element => {
  const t = useTranslations("pages.admin.users.roles.table")

  return <span className="text-sm text-muted-foreground">{t("usersCount", { count: getValue() })}</span>
}

const columnHelper = createColumnHelper<DataTableFeatures, Role>()

export const roleColumns = columnHelper.columns([
  columnHelper.accessor("id", { cell: NameCell, enableSorting: false, header: () => <ColumnHeader id="name" />, id: "name" }),
  columnHelper.accessor("id", {
    cell: DescriptionCell,
    enableSorting: false,
    header: () => <ColumnHeader id="description" />,
    id: "description",
  }),
  columnHelper.accessor("id", { cell: TypeCell, enableSorting: false, header: () => <ColumnHeader id="type" />, id: "type" }),
  columnHelper.accessor("usersCount", { cell: UsersCountCell, header: () => <ColumnHeader id="users" /> }),
  columnHelper.display({ cell: RowActionsCell, header: "", id: "actions" }),
])
