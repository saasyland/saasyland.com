import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { INVITATION_STATUS } from "~/src/modules/invitation/invitation.constants"
import type { Invitation } from "~/src/modules/invitation/invitation.types"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { InvitationActions } from "~/src/presentation/components/custom/admin/users/invitation-actions"
import { DataTableActionsHeader, type DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type OpenInvitation = Invitation["open"]

type InvitationColumn = "email" | "expiresAt" | "invitedBy" | "role" | "sentAt" | "status"

const ColumnHeader = ({ id }: { readonly id: InvitationColumn }): string => {
  const t = useTranslations("pages.admin.users.invitations.table")

  return t(id)
}

const EmailCell = ({ getValue }: CellContext<DataTableFeatures, OpenInvitation, string>): JSX.Element => (
  <span className="block max-w-60 truncate font-medium text-foreground" title={getValue()}>
    {getValue()}
  </span>
)

const RoleCell = ({ row }: CellContext<DataTableFeatures, OpenInvitation, string>): string => {
  const t = useTranslations("pages.admin.users.filters.role.options")

  return t(row.original.role)
}

const StatusCell = ({ row }: CellContext<DataTableFeatures, OpenInvitation, string>): JSX.Element => {
  const t = useTranslations("pages.admin.users.invitations.status")

  const isExpired = row.original.status === INVITATION_STATUS.EXPIRED

  return <Badge variant={isExpired ? "warning" : "accent"}>{t(isExpired ? "expired" : "pending")}</Badge>
}

const InviterCell = ({ getValue }: CellContext<DataTableFeatures, OpenInvitation, string | null>): string => {
  const t = useTranslations("pages.admin.users.invitations")

  return getValue() ?? t("deletedInviter")
}

const DateCell = ({ getValue }: CellContext<DataTableFeatures, OpenInvitation, Date>): JSX.Element => {
  const t = useTranslations("common")
  const format = useFormatter()

  const value = getValue()

  return (
    <time className="text-spec whitespace-nowrap text-muted-foreground" dateTime={value.toISOString()} title={t("dateTime", { value })}>
      {format.dateTime(value, "date")}
    </time>
  )
}

const ActionsCell = ({ row }: CellContext<DataTableFeatures, OpenInvitation>): JSX.Element => (
  <InvitationActions invitation={row.original} />
)

const columnHelper = createColumnHelper<DataTableFeatures, OpenInvitation>()

export const invitationColumns = columnHelper.columns([
  columnHelper.accessor("email", { cell: EmailCell, header: () => <ColumnHeader id="email" />, sortFn: "text" }),
  columnHelper.accessor("role", { cell: RoleCell, enableSorting: false, header: () => <ColumnHeader id="role" /> }),
  columnHelper.accessor("status", { cell: StatusCell, enableSorting: false, header: () => <ColumnHeader id="status" /> }),
  columnHelper.accessor("invitedBy", { cell: InviterCell, enableSorting: false, header: () => <ColumnHeader id="invitedBy" /> }),
  columnHelper.accessor("sentAt", { cell: DateCell, header: () => <ColumnHeader id="sentAt" />, sortFn: "datetime" }),
  columnHelper.accessor("expiresAt", { cell: DateCell, header: () => <ColumnHeader id="expiresAt" />, sortFn: "datetime" }),
  columnHelper.display({ cell: ActionsCell, enableSorting: false, header: DataTableActionsHeader, id: "actions" }),
])
