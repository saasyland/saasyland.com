import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminUsersPending } from "~/src/presentation/components/custom/admin/auth-pending"

import { ROUTES } from "~/src/routes"

export const AUTH_SKELETONS = [
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS },
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS_ALL },
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS_INVITATIONS },
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS_ROLES },
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS_SECURITY },
] as const satisfies readonly PageSkeleton[]
