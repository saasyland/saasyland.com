import type { AdminSkeleton } from "~/src/data/skeletons"

import { AdminLandingPagePending } from "~/src/presentation/components/custom/admin/page-builder-pending"

import { ROUTES } from "~/src/routes"

export const PAGE_BUILDER_SKELETONS = [
  { pendingComponent: AdminLandingPagePending, to: ROUTES.ADMIN_LANDING_PAGE },
] as const satisfies readonly AdminSkeleton[]
