import { ReceiptText, UsersRound } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, NAVIGATION_PLACEMENT, type NavigationArea } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

export const PAYMENTS_NAVIGATION = {
  entries: [
    {
      group: ADMIN_NAVIGATION_GROUP.SALES,
      icon: ReceiptText,
      key: "orders",
      order: 10,
      placement: NAVIGATION_PLACEMENT.ADMIN,
      to: ROUTES.ADMIN_ORDERS,
    },
    { icon: ReceiptText, key: "orders", order: 10, placement: NAVIGATION_PLACEMENT.DASHBOARD, to: ROUTES.ADMIN_ORDERS },
    {
      icon: UsersRound,
      key: "customers",
      order: 20,
      placement: NAVIGATION_PLACEMENT.DASHBOARD,
      to: ROUTES.ADMIN_USERS_CUSTOMERS,
    },
  ],
  name: "payments",
} as const satisfies NavigationArea
