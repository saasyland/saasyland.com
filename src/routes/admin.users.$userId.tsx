import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { listUserSessionsQuery } from "~/src/modules/session/use-cases/list-user-sessions"
import { getUserQuery } from "~/src/modules/user/use-cases/get-user"
import { getUserInitials } from "~/src/modules/user/user.utils"

import { rethrowAsNotFound } from "~/src/lib/not-found"
import { buildPageHead } from "~/src/lib/seo"

import { Avatar, AvatarFallback, AvatarImage } from "~/src/presentation/components/shadcn/avatar"

import { AdminUserProfilePending } from "~/src/presentation/components/custom/admin/auth-pending"
import { UserActions } from "~/src/presentation/components/custom/admin/users/row-actions"
import { UserDetails } from "~/src/presentation/components/custom/admin/users/user-details"
import { UserSessions } from "~/src/presentation/components/custom/admin/users/user-sessions"

import { ROUTES } from "~/src/routes"

const UserProfilePage = (): JSX.Element => {
  const { userId } = Route.useParams()

  const user = useSuspenseQuery(getUserQuery({ userId })).data

  return (
    <div className="custom-scrollbar flex min-h-0 w-full flex-1 animate-in flex-col gap-6 overflow-y-auto pb-6 duration-500 fade-in-50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-12 shrink-0 rounded-lg border border-border">
            {user.image !== null && <AvatarImage alt={user.name} src={user.image} />}
            <AvatarFallback className="rounded-lg bg-muted text-sm font-semibold text-foreground">
              {getUserInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-title font-semibold text-foreground">{user.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <UserActions user={user} />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <UserDetails user={user} />
        <UserSessions user={user} />
      </div>
    </div>
  )
}

export const Route = createFileRoute("/admin/users/$userId")({
  component: UserProfilePage,
  head: ({ loaderData }: { loaderData?: { locale: SupportedLocale; pathname: string; title: string } | undefined }) =>
    buildPageHead({ locale: loaderData?.locale, pathname: loaderData?.pathname ?? ROUTES.ADMIN_USERS, title: loaderData?.title }),
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const [user] = await Promise.all([
      context.queryClient.query(getUserQuery({ userId: params.userId })).catch(rethrowAsNotFound),
      context.queryClient.query(listUserSessionsQuery({ userId: params.userId })),
    ])
    return { locale, pathname: `${ROUTES.ADMIN_USERS}/${user.id}`, title: user.name }
  },
  pendingComponent: AdminUserProfilePending,
})
