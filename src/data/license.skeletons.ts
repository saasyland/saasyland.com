import type { PageSkeleton } from "~/src/data/skeletons"

import { AppLicensePending, AppOverviewPending } from "~/src/presentation/components/custom/app/license-pending"
import { PremiumPending } from "~/src/presentation/components/custom/license-pending"

import { ROUTES } from "~/src/routes"

export const LICENSE_SKELETONS = [
  { pendingComponent: AppOverviewPending, to: ROUTES.APP },
  { pendingComponent: AppLicensePending, to: ROUTES.APP_LICENSE },
  { pendingComponent: PremiumPending, to: ROUTES.PREMIUM },
] as const satisfies readonly PageSkeleton[]
