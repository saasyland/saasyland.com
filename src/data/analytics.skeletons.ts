import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminAnalyticsPending } from "~/src/presentation/components/custom/admin/analytics-pending"

import { ROUTES } from "~/src/routes"

export const ANALYTICS_SKELETONS = [
  { pendingComponent: AdminAnalyticsPending, to: ROUTES.ADMIN_ANALYTICS },
] as const satisfies readonly PageSkeleton[]
