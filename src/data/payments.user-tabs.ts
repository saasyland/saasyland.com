import type { UserTab } from "~/src/data/user-tabs"

import * as ROUTES from "~/src/routes"

const AREA = "payments"

export const PAYMENTS_USER_TABS = [
  { area: AREA, key: "customers", order: 20, to: ROUTES.ADMIN_USERS_CUSTOMERS },
] as const satisfies readonly UserTab[]
