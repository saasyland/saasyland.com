import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"
import { AdminDashboardPending, AdminSettingsPending } from "~/src/presentation/components/custom/admin/auth-pending"
import { AppSettingsPending } from "~/src/presentation/components/custom/app/auth-pending"

import { ROUTES } from "~/src/routes"

export const AUTH_SKELETONS = [
  { pendingComponent: AdminDashboardPending, to: ROUTES.ADMIN },
  { pendingComponent: AdminSettingsPending, to: ROUTES.ADMIN_SETTINGS },
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS },
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS_ALL },
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS_SECURITY },
  { pendingComponent: AppSettingsPending, to: ROUTES.APP_SETTINGS },
] as const satisfies readonly PageSkeleton[]
