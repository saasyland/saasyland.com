import { Globe, Home, Settings, Users } from "lucide-react"

import { ADMIN_NAVIGATION_GROUP, FOOTER_COLUMN, NAVIGATION_PLACEMENT, type NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

const AREA = "auth"

export const AUTH_NAVIGATION = [
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.OVERVIEW,
    icon: Home,
    key: "dashboard",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN,
  },
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
    icon: Users,
    key: "userManagement",
    order: 10,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_USERS,
  },
  {
    area: AREA,
    group: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
    icon: Settings,
    key: "settings",
    order: 30,
    placement: NAVIGATION_PLACEMENT.ADMIN,
    to: ROUTES.ADMIN_SETTINGS,
  },
  { area: AREA, icon: Home, key: "overview", order: 10, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP },
  { area: AREA, icon: Settings, key: "settings", order: 30, placement: NAVIGATION_PLACEMENT.APP, to: ROUTES.APP_SETTINGS },
  { area: AREA, icon: Globe, key: "viewSite", order: 90, placement: NAVIGATION_PLACEMENT.COMMAND, to: ROUTES.HOME },
  {
    area: AREA,
    column: FOOTER_COLUMN.PRODUCT,
    key: "signIn",
    order: 40,
    placement: NAVIGATION_PLACEMENT.FOOTER,
    signedIn: { key: "account" },
    to: ROUTES.SIGN_IN,
  },
  {
    area: AREA,
    key: "signIn",
    order: 50,
    placement: NAVIGATION_PLACEMENT.HEADER,
    signedIn: { key: "account" },
    to: ROUTES.SIGN_IN,
  },
] as const satisfies readonly NavigationEntry[]
