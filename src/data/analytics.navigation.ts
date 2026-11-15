import { BarChart } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, FEATURE_STATUS, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "analytics"

export const ANALYTICS_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.OVERVIEW,
    icon: BarChart,
    key: "analytics",
    order: 20,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    status: FEATURE_STATUS.ARRIVING,
    to: ROUTES.ADMIN_ANALYTICS,
  },
] as const satisfies readonly NavigationEntry[]
