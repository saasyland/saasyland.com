import { BarChart } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const ANALYTICS_NAVIGATION = [
  {
    group: ADMIN_NAVIGATION_GROUP.OVERVIEW,
    icon: BarChart,
    key: "analytics",
    order: 20,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_ANALYTICS,
  },
] as const satisfies readonly NavigationEntry[]
