import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { type ADMIN_INVITATION_ROWS, ADMIN_STATUS_BADGE_CLASSES } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { RowActionsCell } from "~/src/presentation/components/custom/admin/row-actions-cell"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type Invitation = (typeof ADMIN_INVITATION_ROWS)[number]

const ColumnHeader = ({ id }: { readonly id: "email" | "role" | "sentDate" | "status" }): string => {
  const t = useTranslations("pages.admin.users.invitations.table.headers")

  return t(id)
}

const DemoCell = ({ column, row }: CellContext<DataTableFeatures, Invitation, string>): string => {
  const t = useTranslations("pages.admin.users.demo.invitations")

  return t(`${row.original.id}.${column.id}`)
}

const StatusCell = ({ row }: CellContext<DataTableFeatures, Invitation, string>): JSX.Element => {
  const t = useTranslations("pages.admin.users.demo.invitations")

  return (
    <Badge className={cn("px-2 py-1 text-xs font-medium", ADMIN_STATUS_BADGE_CLASSES[row.original.statusColor])} variant="outline">
      {t(`${row.original.id}.status`)}
    </Badge>
  )
}

const columnHelper = createColumnHelper<DataTableFeatures, Invitation>()

export const invitationColumns = columnHelper.columns([
  columnHelper.accessor("email", {
    cell: ({ getValue }) => <span className="text-sm font-medium text-foreground">{getValue()}</span>,
    header: () => <ColumnHeader id="email" />,
  }),
  columnHelper.accessor("id", { cell: DemoCell, enableSorting: false, header: () => <ColumnHeader id="role" />, id: "role" }),
  columnHelper.accessor("statusColor", { cell: StatusCell, header: () => <ColumnHeader id="status" />, id: "status" }),
  columnHelper.accessor("id", { cell: DemoCell, enableSorting: false, header: () => <ColumnHeader id="sentDate" />, id: "sentDate" }),
  columnHelper.display({ cell: RowActionsCell, header: "", id: "actions" }),
])
