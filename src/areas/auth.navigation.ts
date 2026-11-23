import { Globe, Home, Settings, Users } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationArea } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

export const AUTH_NAVIGATION = {
  entries: [
    {
      group: ADMIN_NAVIGATION_GROUP.OVERVIEW,
      icon: Home,
      key: "dashboard",
      order: 10,
      placement: NAVIGATION_PLACEMENT.ADMIN,
      to: ROUTES.ADMIN,
    },
    {
      group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
      icon: Users,
      key: "userManagement",
      order: 10,
      placement: NAVIGATION_PLACEMENT.ADMIN,
      to: ROUTES.ADMIN_USERS,
    },
    {
      group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
      icon: Settings,
      key: "settings",
      order: 30,
      placement: NAVIGATION_PLACEMENT.ADMIN,
      to: ROUTES.ADMIN_SETTINGS,
    },
    { icon: Home, key: "overview", order: 10, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP },
    { icon: Settings, key: "settings", order: 30, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP_SETTINGS },
    { icon: Globe, key: "viewSite", order: 90, placement: NAVIGATION_PLACEMENT.COMMAND, to: ROUTES.HOME },
    {
      column: FOOTER_COLUMN.PRODUCT,
      key: "signIn",
      order: 40,
      placement: NAVIGATION_PLACEMENT.FOOTER,
      signedIn: { key: "account" },
      to: ROUTES.SIGN_IN,
    },
    {
      key: "signIn",
      order: 50,
      placement: NAVIGATION_PLACEMENT.HEADER,
      signedIn: { key: "account" },
      to: ROUTES.SIGN_IN,
    },
  ],
  name: "auth",
} as const satisfies NavigationArea
