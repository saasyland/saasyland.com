import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminProductsPending } from "~/src/presentation/components/custom/admin/products-pending"

import { ROUTES } from "~/src/routes"

export const PRODUCTS_SKELETONS = [
  { pendingComponent: AdminProductsPending, to: ROUTES.ADMIN_PRODUCTS },
] as const satisfies readonly PageSkeleton[]
