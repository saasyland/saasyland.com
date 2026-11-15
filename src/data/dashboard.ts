import { type AdminDashboardEntry, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"
import * as AREA_DASHBOARD from "~/src/data/dashboard.entries"

const AREAS: Readonly<Record<string, readonly AdminDashboardEntry[]>> = AREA_DASHBOARD

const ENTRIES = Object.values(AREAS)
  .flat()
  .toSorted((first, second) => first.order - second.order)

export const ADMIN_DASHBOARD_STATS = ENTRIES.filter((entry) => entry.placement === DASHBOARD_PLACEMENT.STAT)

export const ADMIN_DASHBOARD_PANELS = ENTRIES.filter((entry) => entry.placement === DASHBOARD_PLACEMENT.PANEL)
