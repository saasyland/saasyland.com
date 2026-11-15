import type { UserTab } from "~/src/data/user-tabs"

import { AdminUsersAllPending, AdminUsersSecurityPending } from "~/src/presentation/components/custom/admin/auth-pending"

import { ROUTES } from "~/src/routes"

const AREA = "auth"

export const AUTH_USER_TABS = [
  { area: AREA, key: "allUsers", order: 10, pendingComponent: AdminUsersAllPending, to: ROUTES.ADMIN_USERS_ALL },
  { area: AREA, key: "security", order: 40, pendingComponent: AdminUsersSecurityPending, to: ROUTES.ADMIN_USERS_SECURITY },
] as const satisfies readonly UserTab[]
