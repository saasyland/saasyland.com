import type { AdminSkeleton } from "~/src/data/skeletons"

import { AdminDashboardPending, AdminSettingsPending } from "~/src/presentation/components/custom/admin/core-pending"

import { ROUTES } from "~/src/routes"

export const CORE_SKELETONS = [
  { pendingComponent: AdminDashboardPending, to: ROUTES.ADMIN },
  { pendingComponent: AdminSettingsPending, to: ROUTES.ADMIN_SETTINGS },
] as const satisfies readonly AdminSkeleton[]
