import { MonitorSmartphone } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, FEATURE_STATUS, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "page-builder"

export const PAGE_BUILDER_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.CONTENT,
    icon: MonitorSmartphone,
    key: "landingPage",
    order: 40,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    status: FEATURE_STATUS.ARRIVING,
    to: ROUTES.ADMIN_LANDING_PAGE,
  },
] as const satisfies readonly NavigationEntry[]
