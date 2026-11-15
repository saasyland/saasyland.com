import { CreditCard, Tags } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, FEATURE_STATUS, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "payments"

export const PAYMENTS_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.OFFERINGS,
    icon: Tags,
    key: "pricingModels",
    order: 20,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    status: FEATURE_STATUS.ARRIVING,
    to: ROUTES.ADMIN_PRICING,
  },
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
    icon: CreditCard,
    key: "payments",
    order: 20,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    status: FEATURE_STATUS.ARRIVING,
    to: ROUTES.ADMIN_PAYMENTS,
  },
] as const satisfies readonly NavigationEntry[]
