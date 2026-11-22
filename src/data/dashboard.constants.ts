import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"
import type { AsyncRouteComponent } from "@tanstack/react-router"

export const DASHBOARD_PLACEMENT = {
  PANEL: "panel",
  STAT: "stat",
} as const

interface Entry {
  readonly area: string
  readonly key: string
  readonly order: number
}

export interface AdminDashboardStat extends Entry {
  readonly placement: typeof DASHBOARD_PLACEMENT.STAT
  readonly prefetch: (queryClient: QueryClient) => Promise<unknown>
  readonly useValue: () => number
}

export interface AdminDashboardPanel extends Entry {
  readonly Panel: AsyncRouteComponent<unknown>
  readonly Pending: () => JSX.Element
  readonly placement: typeof DASHBOARD_PLACEMENT.PANEL
  readonly prefetch?: (queryClient: QueryClient) => Promise<unknown>
}

export type AdminDashboardEntry = AdminDashboardPanel | AdminDashboardStat
