import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { UserStatus } from "~/src/modules/user/user.utils"

import { ADMIN_STATUS_BADGE_CLASSES, USER_STATUS_COLORS } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

export const UserStatusBadge = ({ status }: { readonly status: UserStatus }): JSX.Element => {
  const t = useTranslations("pages.admin.users.filters.status.options")

  return (
    <Badge
      className={cn("gap-1.5 rounded-md px-2 py-0.5 text-label", ADMIN_STATUS_BADGE_CLASSES[USER_STATUS_COLORS[status]])}
      variant="outline"
    >
      {t(status)}
    </Badge>
  )
}
