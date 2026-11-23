import { ReceiptText, UsersRound } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

const AREA = "payments"

export const PAYMENTS_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.SALES,
    icon: ReceiptText,
    key: "orders",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_ORDERS,
  },
  { area: AREA, icon: ReceiptText, key: "orders", order: 10, placement: NAVIGATION_PLACEMENT.DASHBOARD, to: ROUTES.ADMIN_ORDERS },
  {
    area: AREA,
    icon: UsersRound,
    key: "customers",
    order: 20,
    placement: NAVIGATION_PLACEMENT.DASHBOARD,
    to: ROUTES.ADMIN_USERS_CUSTOMERS,
  },
] as const satisfies readonly NavigationEntry[]
