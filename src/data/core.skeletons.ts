import type { PageSkeleton } from "~/src/data/skeletons"

import { HomePending } from "~/src/presentation/components/custom/core-pending"

import { ROUTES } from "~/src/routes"

export const CORE_SKELETONS = [{ pendingComponent: HomePending, to: ROUTES.HOME }] as const satisfies readonly PageSkeleton[]
