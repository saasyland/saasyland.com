import type { QueryClient } from "@tanstack/react-query"

import * as AREA_DASHBOARD from "~/src/data/dashboard.entries"

export interface AdminDashboardStat {
  readonly key: string
  readonly order: number
  readonly prefetch: (queryClient: QueryClient) => Promise<unknown>
  readonly useValue: () => number
}

export const ADMIN_DASHBOARD_STATS = Object.values(AREA_DASHBOARD)
  .flat()
  .toSorted((first, second) => first.order - second.order)
