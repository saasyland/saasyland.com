import { Users } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

export const AUTH_NAVIGATION = [
  {
    group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
    icon: Users,
    key: "userManagement",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_USERS,
  },
  { column: FOOTER_COLUMN.PRODUCT, key: "signIn", order: 40, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.SIGN_IN },
] as const satisfies readonly NavigationEntry[]
