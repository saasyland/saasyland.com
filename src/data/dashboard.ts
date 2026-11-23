import { BROWSER_AREAS } from "~/src/areas/browser"
import { type AdminDashboardEntry, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

const ENTRIES: readonly (AdminDashboardEntry & { readonly area: string })[] = BROWSER_AREAS.flatMap(({ dashboard = [], name }) =>
  dashboard.map((entry) => ({ ...entry, area: name })),
).toSorted((first, second) => first.order - second.order)

export const ADMIN_DASHBOARD_STATS = ENTRIES.filter((entry) => entry.placement === DASHBOARD_PLACEMENT.STAT)

export const ADMIN_DASHBOARD_PANELS = ENTRIES.filter((entry) => entry.placement === DASHBOARD_PLACEMENT.PANEL)
