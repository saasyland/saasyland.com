import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminProductCreatePending, AdminProductsPending } from "~/src/presentation/components/custom/admin/products-pending"

import { ROUTES } from "~/src/routes"

export const PRODUCTS_SKELETONS = [
  { pendingComponent: AdminProductsPending, to: ROUTES.ADMIN_PRODUCTS },
  { pendingComponent: AdminProductCreatePending, to: ROUTES.ADMIN_PRODUCTS_CREATE },
] as const satisfies readonly PageSkeleton[]
