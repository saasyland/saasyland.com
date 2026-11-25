import { type JSX, useMemo } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"
import { DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import { INVITATION_STATUS } from "~/src/modules/invitation/invitation.constants"
import type { Invitation } from "~/src/modules/invitation/invitation.types"

import { INVITATION_COLUMN_SIZES } from "~/src/data/admin"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type OpenInvitation = Invitation["open"]

export const INVITATION_GRID_ID = "invitations"

const OPEN_STATUSES = [INVITATION_STATUS.PENDING, INVITATION_STATUS.EXPIRED] as const

const EmailCell = ({ getValue }: CellContext<DataGridFeatures, OpenInvitation, string>): JSX.Element => (
  <span className="block truncate font-medium text-foreground" title={getValue()}>
    {getValue()}
  </span>
)

const RoleCell = ({ getValue }: CellContext<DataGridFeatures, OpenInvitation, OpenInvitation["role"]>): JSX.Element => {
  const t = useTranslations("pages.admin.users.filters.role.options")

  return <span className="text-sm text-muted-foreground">{t(getValue())}</span>
}

const StatusCell = ({ getValue }: CellContext<DataGridFeatures, OpenInvitation, OpenInvitation["status"]>): JSX.Element => {
  const t = useTranslations("pages.admin.users.invitations.status")

  const isExpired = getValue() === INVITATION_STATUS.EXPIRED

  return <Badge variant={isExpired ? "warning" : "accent"}>{t(isExpired ? "expired" : "pending")}</Badge>
}

const InviterCell = ({ getValue }: CellContext<DataGridFeatures, OpenInvitation, string | null>): JSX.Element => {
  const t = useTranslations("pages.admin.users.invitations")

  return <span className="text-sm text-muted-foreground">{getValue() ?? t("deletedInviter")}</span>
}

const DateCell = ({ getValue }: CellContext<DataGridFeatures, OpenInvitation, Date>): JSX.Element => {
  const t = useTranslations("auth.dates")
  const format = useFormatter()

  const value = getValue()

  return (
    <time className="text-sm text-muted-foreground" dateTime={value.toISOString()} title={t("dateTime", { value })}>
      {format.dateTime(value, "date")}
    </time>
  )
}

const columnHelper = createColumnHelper<DataGridFeatures, OpenInvitation>()

export const useInvitationColumns = (): DataGridColumn<OpenInvitation>[] => {
  const t = useTranslations("pages.admin.users")

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("email", {
          cell: EmailCell,
          header: t("invitations.table.email"),
          meta: { filter: { kind: DATA_GRID_FILTER.TEXT }, pinned: DATA_GRID_PIN.START },
          size: INVITATION_COLUMN_SIZES.email,
          sortFn: "text",
        }),
        columnHelper.accessor("role", {
          cell: RoleCell,
          header: t("invitations.table.role"),
          meta: {
            export: ({ role }) => t(`filters.role.options.${role}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: ROLE_VALUES.map((value) => ({ label: t(`filters.role.options.${value}`), value })),
            },
          },
          size: INVITATION_COLUMN_SIZES.role,
        }),
        columnHelper.accessor("status", {
          cell: StatusCell,
          header: t("invitations.table.status"),
          meta: {
            export: ({ status }) => t(`invitations.status.${status === INVITATION_STATUS.EXPIRED ? "expired" : "pending"}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: OPEN_STATUSES.map((value) => ({ label: t(`invitations.status.${value}`), value })),
            },
          },
          size: INVITATION_COLUMN_SIZES.status,
        }),
        columnHelper.accessor("invitedBy", {
          cell: InviterCell,
          header: t("invitations.table.invitedBy"),
          meta: { export: ({ invitedBy }) => invitedBy ?? t("invitations.deletedInviter"), filter: { kind: DATA_GRID_FILTER.TEXT } },
          size: INVITATION_COLUMN_SIZES.invitedBy,
        }),
        columnHelper.accessor("sentAt", {
          cell: DateCell,
          header: t("invitations.table.sentAt"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: INVITATION_COLUMN_SIZES.date,
          sortFn: "datetime",
        }),
        columnHelper.accessor("expiresAt", {
          cell: DateCell,
          header: t("invitations.table.expiresAt"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: INVITATION_COLUMN_SIZES.date,
          sortFn: "datetime",
        }),
      ]),
    [t],
  )
}
