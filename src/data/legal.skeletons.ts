import type { PageSkeleton } from "~/src/data/skeletons"

import { LegalPending } from "~/src/presentation/components/custom/legal-pending"

import { ROUTES } from "~/src/routes"

export const LEGAL_SKELETONS = [
  { pendingComponent: LegalPending, to: ROUTES.AFFILIATES },
  { pendingComponent: LegalPending, to: ROUTES.LICENCE },
  { pendingComponent: LegalPending, to: ROUTES.PRIVACY },
  { pendingComponent: LegalPending, to: ROUTES.REFUNDS },
  { pendingComponent: LegalPending, to: ROUTES.TERMS },
] as const satisfies readonly PageSkeleton[]
