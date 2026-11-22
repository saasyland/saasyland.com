import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { listInvitationsQuery } from "~/src/modules/invitation/use-cases/list-invitations"

import { invitationColumns } from "~/src/presentation/components/custom/admin/users/invitation-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

export const InvitationList = (): JSX.Element => {
  const t = useTranslations("pages.admin.users.invitations")

  const invitations = useSuspenseQuery(listInvitationsQuery).data

  return (
    <section aria-labelledby="open-invitations" className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <h2 className="text-title text-foreground" id="open-invitations">
          {t("title")}
        </h2>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{t("description")}</p>
      </div>
      {invitations.length === 0 && <p className="text-body-sm text-muted-foreground">{t("empty")}</p>}
      {invitations.length > 0 && <DataTable columns={invitationColumns} data={invitations} />}
    </section>
  )
}
