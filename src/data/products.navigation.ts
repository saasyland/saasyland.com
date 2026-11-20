import { Package } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "products"

export const PRODUCTS_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.OFFERINGS,
    icon: Package,
    key: "products",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_PRODUCTS,
  },
] as const satisfies readonly NavigationEntry[]
