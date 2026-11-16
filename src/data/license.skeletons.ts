import type { PageSkeleton } from "~/src/data/skeletons"

import { AppLicensePending } from "~/src/presentation/components/custom/app/license-pending"

import { ROUTES } from "~/src/routes"

export const LICENSE_SKELETONS = [
  { pendingComponent: AppLicensePending, to: ROUTES.APP_LICENSE },
] as const satisfies readonly PageSkeleton[]
