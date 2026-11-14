import { Package, PlusCircle } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const PRODUCTS_NAVIGATION = [
  {
    group: ADMIN_NAVIGATION_GROUP.OFFERINGS,
    icon: Package,
    key: "products",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_PRODUCTS,
  },
  { icon: PlusCircle, key: "addProduct", order: 10, placement: NAVIGATION_PLACEMENT.DASHBOARD, to: ROUTES.ADMIN_PRODUCTS_CREATE },
] as const satisfies readonly NavigationEntry[]
