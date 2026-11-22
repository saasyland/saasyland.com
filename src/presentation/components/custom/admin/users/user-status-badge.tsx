import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { UserStatus } from "~/src/modules/user/user.utils"

import { USER_STATUS_BADGES } from "~/src/data/admin"

import { Badge } from "~/src/presentation/components/shadcn/badge"

export const UserStatusBadge = ({ status }: { readonly status: UserStatus }): JSX.Element => {
  const t = useTranslations("pages.admin.users.filters.status.options")

  return <Badge variant={USER_STATUS_BADGES[status]}>{t(status)}</Badge>
}
