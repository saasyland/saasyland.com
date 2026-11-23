import type { UserTab } from "~/src/data/user-tabs"

import * as ROUTES from "~/src/routes"

const AREA = "auth"

export const AUTH_USER_TABS = [
  { area: AREA, key: "allUsers", order: 10, to: ROUTES.ADMIN_USERS_ALL },
  { area: AREA, key: "invitations", order: 30, to: ROUTES.ADMIN_USERS_INVITATIONS },
] as const satisfies readonly UserTab[]
