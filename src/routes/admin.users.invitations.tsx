import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Link, Mail } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { ADMIN_INVITATION_ROWS } from "~/src/data/admin"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AdminUsersInvitationsPending } from "~/src/presentation/components/custom/admin/administration-pending"
import { invitationColumns } from "~/src/presentation/components/custom/admin/users/invitation-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const UsersInvitationsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.users.invitations")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" size="sm" className="h-10 gap-2">
          <Link className="size-4 text-muted-foreground" />
          {t("actions.copyLink")}
        </Button>
        <Button size="sm" className="h-10 gap-2">
          <Mail className="size-4" />
          {t("actions.sendInvite")}
        </Button>
      </div>

      <DataTable
        columns={invitationColumns}
        data={ADMIN_INVITATION_ROWS}
        filters={[{ columnId: "email", placeholder: t("search.placeholder"), type: "search" }]}
      />
    </div>
  )
}

const NAMESPACE = "pages.admin.users"

export const Route = createFileRoute("/admin/users/invitations")({
  component: UsersInvitationsPage,
  head: pageHead(ROUTES.ADMIN_USERS_INVITATIONS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminUsersInvitationsPending,
  staticData: { namespaces: [NAMESPACE] },
})
