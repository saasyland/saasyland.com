import { CreditCard, Tags } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const PAYMENTS_NAVIGATION = [
  {
    group: ADMIN_NAVIGATION_GROUP.OFFERINGS,
    icon: Tags,
    key: "pricingModels",
    order: 20,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_PRICING,
  },
  {
    group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
    icon: CreditCard,
    key: "payments",
    order: 20,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_PAYMENTS,
  },
] as const satisfies readonly NavigationEntry[]
