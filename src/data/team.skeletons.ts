import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"

import { ROUTES } from "~/src/routes"

export const TEAM_SKELETONS = [
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS_INVITATIONS },
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS_ROLES },
] as const satisfies readonly PageSkeleton[]
