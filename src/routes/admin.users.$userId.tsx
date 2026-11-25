import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { listUserSessionsQuery } from "~/src/modules/session/use-cases/list-user-sessions"
import { getUserQuery } from "~/src/modules/user/use-cases/get-user"
import { getUserInitials } from "~/src/modules/user/user.utils"

import { recordHead, rethrowAsNotFound } from "~/src/lib/not-found"

import { Avatar, AvatarFallback, AvatarImage } from "~/src/presentation/components/shadcn/avatar"

import { AdminUserProfilePending } from "~/src/presentation/components/custom/admin/auth-pending"
import { UserActions } from "~/src/presentation/components/custom/admin/users/row-actions"
import { UserDetails } from "~/src/presentation/components/custom/admin/users/user-details"
import { USER_PROFILE_SECTIONS, UserProfileSections } from "~/src/presentation/components/custom/admin/users/user-profile-sections"
import { UserSessions } from "~/src/presentation/components/custom/admin/users/user-sessions"

import { ROUTES } from "~/src/routes"

const UserProfilePage = (): JSX.Element => {
  const { userId } = Route.useParams()

  const user = useSuspenseQuery(getUserQuery({ userId })).data

  return (
    <div className="custom-scrollbar flex min-h-0 w-full flex-1 animate-in flex-col gap-6 overflow-y-auto pb-6 duration-500 fade-in-50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-12 shrink-0 border border-border">
            {user.image !== null && <AvatarImage alt={user.name} src={user.image} />}
            <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">{getUserInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-title font-semibold text-foreground">{user.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <UserActions user={user} />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <UserDetails user={user} />
          <UserProfileSections userId={user.id} />
        </div>
        <UserSessions user={user} />
      </div>
    </div>
  )
}

export const Route = createFileRoute("/admin/users/$userId")({
  component: UserProfilePage,
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const [user] = await Promise.all([
      context.queryClient.query(getUserQuery({ userId: params.userId })).catch(rethrowAsNotFound),
      context.queryClient.query(listUserSessionsQuery({ userId: params.userId })),
      ...USER_PROFILE_SECTIONS.map(({ load }) => load({ queryClient: context.queryClient, userId: params.userId })),
    ])
    return { locale, pathname: `${ROUTES.ADMIN.USERS.INDEX}/${user.id}`, title: user.name }
  },
  head: recordHead(ROUTES.ADMIN.USERS.INDEX),
  pendingComponent: AdminUserProfilePending,
})
