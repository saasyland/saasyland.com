import type { AdminSkeleton } from "~/src/data/skeletons"

import { AdminPaymentsPending, AdminPricingModelsPending } from "~/src/presentation/components/custom/admin/payments-pending"

import { ROUTES } from "~/src/routes"

export const PAYMENTS_SKELETONS = [
  { pendingComponent: AdminPaymentsPending, to: ROUTES.ADMIN_PAYMENTS },
  { pendingComponent: AdminPricingModelsPending, to: ROUTES.ADMIN_PRICING },
] as const satisfies readonly AdminSkeleton[]
