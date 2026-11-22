import type { PageSkeleton } from "~/src/data/skeletons"

import { AppLicensePending } from "~/src/presentation/components/custom/app/license-pending"
import { WithdrawalPending } from "~/src/presentation/components/custom/withdrawal-pending"

import { ROUTES } from "~/src/routes"

export const LICENSE_SKELETONS = [
  { pendingComponent: AppLicensePending, to: ROUTES.APP_LICENSE },
  { pendingComponent: WithdrawalPending, to: ROUTES.WITHDRAWAL },
] as const satisfies readonly PageSkeleton[]
