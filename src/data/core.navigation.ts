import { Home, Settings } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "core"

export const CORE_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.OVERVIEW,
    icon: Home,
    key: "dashboard",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN,
  },
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
    icon: Settings,
    key: "settings",
    order: 30,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_SETTINGS,
  },
  { area: AREA, icon: Home, key: "overview", order: 10, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP },
  { area: AREA, icon: Settings, key: "settings", order: 30, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP_SETTINGS },
] as const satisfies readonly NavigationEntry[]
