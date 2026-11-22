import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"
import { AdminOrdersPending } from "~/src/presentation/components/custom/admin/payments-pending"

import { ROUTES } from "~/src/routes"

export const PAYMENTS_SKELETONS = [
  { pendingComponent: AdminOrdersPending, to: ROUTES.ADMIN_ORDERS },
  { pendingComponent: AdminUsersPending, to: ROUTES.ADMIN_USERS_CUSTOMERS },
] as const satisfies readonly PageSkeleton[]
