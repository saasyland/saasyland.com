import { Package } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationArea } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

export const PRODUCTS_NAVIGATION = {
  entries: [
    {
      group: ADMIN_NAVIGATION_GROUP.OFFERINGS,
      icon: Package,
      key: "products",
      order: 10,
      placement: NAVIGATION_PLACEMENT.ADMIN,
      to: ROUTES.ADMIN_PRODUCTS,
    },
  ],
  name: "products",
} as const satisfies NavigationArea
