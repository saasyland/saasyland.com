import { Home, Settings } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const CORE_NAVIGATION = [
  {
    group: ADMIN_NAVIGATION_GROUP.OVERVIEW,
    icon: Home,
    key: "dashboard",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN,
  },
  {
    group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
    icon: Settings,
    key: "settings",
    order: 30,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_SETTINGS,
  },
  { icon: Home, key: "overview", order: 10, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP },
  { icon: Settings, key: "settings", order: 30, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP_SETTINGS },
] as const satisfies readonly NavigationEntry[]
