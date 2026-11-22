import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import * as zod from "zod"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"
import { invitationQuery } from "~/src/modules/invitation/use-cases/get-invitation"

import { onlyDeclaredSearch, searchText } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { AcceptInvitation, InvitationUnavailable } from "~/src/presentation/components/custom/auth/accept-invitation"
import { AcceptInvitationPending } from "~/src/presentation/components/custom/auth/auth-pending"

import { ROUTES } from "~/src/routes"

const inviteSearchSchema = zod.object({ token: searchText() })

const InvitePage = (): JSX.Element => {
  const request = invitationZodSchemas.getInvitation.safeParse(Route.useSearch())

  if (!request.success) {
    return <InvitationUnavailable status={undefined} />
  }

  return <AcceptInvitation token={request.data.token} />
}

const NAMESPACE = "pages.auth.invite"

export const Route = createFileRoute("/auth/invite")({
  validateSearch: inviteSearchSchema,
  component: InvitePage,
  head: pageHead(ROUTES.ACCEPT_INVITATION),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const locale = getCurrentLocale()
    const request = invitationZodSchemas.getInvitation.safeParse(deps)
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getCurrentSessionQuery, staleTime: "static" }),
      ...(request.success ? [context.queryClient.query({ ...invitationQuery(request.data), staleTime: "static" })] : []),
    ])
    return { locale, metadata }
  },
  pendingComponent: AcceptInvitationPending,
  search: { middlewares: [onlyDeclaredSearch(inviteSearchSchema)] },
  staticData: { namespaces: [NAMESPACE] },
})
