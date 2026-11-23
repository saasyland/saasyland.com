import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"
import type { AsyncRouteComponent } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

export const DASHBOARD_PLACEMENT = {
  PANEL: "panel",
  STAT: "stat",
} as const

interface Entry {
  readonly key: string
  readonly order: number
}

export interface AdminDashboardStat extends Entry {
  readonly icon: LucideIcon
  readonly placement: typeof DASHBOARD_PLACEMENT.STAT
  readonly to?: string
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
