import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminDashboardPending, AdminSettingsPending } from "~/src/presentation/components/custom/admin/core-pending"
import { AppSettingsPending } from "~/src/presentation/components/custom/app/core-pending"
import { HomePending } from "~/src/presentation/components/custom/core-pending"

import { ROUTES } from "~/src/routes"

export const CORE_SKELETONS = [
  { pendingComponent: AdminDashboardPending, to: ROUTES.ADMIN },
  { pendingComponent: AdminSettingsPending, to: ROUTES.ADMIN_SETTINGS },
  { pendingComponent: AppSettingsPending, to: ROUTES.APP_SETTINGS },
  { pendingComponent: HomePending, to: ROUTES.HOME },
] as const satisfies readonly PageSkeleton[]
