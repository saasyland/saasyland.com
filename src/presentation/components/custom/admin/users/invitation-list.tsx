import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { listInvitationsQuery } from "~/src/modules/invitation/use-cases/list-invitations"

import { InvitationRowActions } from "~/src/presentation/components/custom/admin/users/invitation-actions"
import { INVITATION_GRID_ID, useInvitationColumns } from "~/src/presentation/components/custom/admin/users/invitation-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

export const InvitationList = (): JSX.Element => {
  const t = useTranslations("pages.admin.users.invitations")
  const columns = useInvitationColumns()

  const invitations = useSuspenseQuery(listInvitationsQuery).data

  return (
    <section aria-labelledby="open-invitations" className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <h2 className="text-title text-foreground" id="open-invitations">
          {t("title")}
        </h2>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{t("description")}</p>
      </div>
      <DataGrid
        columns={columns}
        data={invitations}
        empty={t("empty")}
        emptyDescription={t("emptyDescription")}
        id={INVITATION_GRID_ID}
        label={t("title")}
        rowActions={InvitationRowActions}
        search={t("search")}
      />
    </section>
  )
}
