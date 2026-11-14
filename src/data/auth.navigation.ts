import { Users } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "auth"

export const AUTH_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
    icon: Users,
    key: "userManagement",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_USERS,
  },
  { area: AREA, column: FOOTER_COLUMN.PRODUCT, key: "signIn", order: 40, placement: NAVIGATION_PLACEMENT.FOOTER, to: ROUTES.SIGN_IN },
] as const satisfies readonly NavigationEntry[]
