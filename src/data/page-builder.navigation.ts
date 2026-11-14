import { MonitorSmartphone } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const PAGE_BUILDER_NAVIGATION = [
  {
    group: ADMIN_NAVIGATION_GROUP.CONTENT,
    icon: MonitorSmartphone,
    key: "landingPage",
    order: 40,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_LANDING_PAGE,
  },
] as const satisfies readonly NavigationEntry[]
