import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { listInvitationsQuery } from "~/src/modules/invitation/use-cases/list-invitations"

import { pageHead } from "~/src/lib/seo"

import { AdminUsersInvitationsPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { InvitationList } from "~/src/presentation/components/custom/admin/users/invitation-list"
import { InviteUserDialog } from "~/src/presentation/components/custom/admin/users/invite-user-dialog"

import { ROUTES } from "~/src/routes"

const InvitationsPage = (): JSX.Element => (
  <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
    <div className="flex justify-end">
      <InviteUserDialog />
    </div>

    <InvitationList />
  </div>
)

const NAMESPACE = "pages.admin.users"
const NAMESPACES = [NAMESPACE, "pages.admin.users.invitations"] as const

export const Route = createFileRoute("/admin/users/invitations")({
  component: InvitationsPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: NAMESPACES, queryClient: context.queryClient }),
      context.queryClient.query({ ...listInvitationsQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.ADMIN.USERS.INVITATIONS),
  pendingComponent: AdminUsersInvitationsPending,
  staticData: { namespaces: NAMESPACES },
})
