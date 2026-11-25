import type { JSX, ReactNode } from "react"

import { useTranslations } from "use-intl/react"

import { isRole } from "~/src/integrations/better-auth/auth.roles"

import type { User } from "~/src/modules/user/user.types"
import { getUserStatus } from "~/src/modules/user/user.utils"

import { ADMIN_USER_DETAILS } from "~/src/data/admin"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { UserStatusBadge } from "~/src/presentation/components/custom/admin/users/user-status-badge"

type UserDetail = (typeof ADMIN_USER_DETAILS)[number]

export const UserDetails = ({ user }: { readonly user: User["select"] }): JSX.Element => {
  const t = useTranslations()

  const values: Record<UserDetail, ReactNode> = {
    createdAt: t("auth.dates.dateTime", { value: user.createdAt }),
    emailVerified: t(`pages.admin.users.table.booleans.${user.emailVerified ? "yes" : "no"}`),
    role: isRole(user.role) ? t(`pages.admin.users.filters.role.options.${user.role}`) : user.role,
    status: <UserStatusBadge status={getUserStatus(user)} />,
    timezone: user.timezone,
    twoFactorEnabled: t(`pages.admin.users.table.booleans.${user.twoFactorEnabled ? "yes" : "no"}`),
    updatedAt: t("auth.dates.dateTime", { value: user.updatedAt }),
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("pages.admin.users.profile.details")}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border text-sm">
          {ADMIN_USER_DETAILS.map((detail) => (
            <div className="flex items-center justify-between gap-4 py-2.5" key={detail}>
              <dt className="text-muted-foreground">{t(`pages.admin.users.table.headers.${detail}`)}</dt>
              <dd className="text-right text-foreground">{values[detail]}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
